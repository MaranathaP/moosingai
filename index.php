<?php
declare(strict_types=1);
use function Moosing\{config, db, need, query, json, now, uid};
require __DIR__ . "/server/core.php";
require __DIR__ . "/server/collection.php";
require __DIR__ . "/server/payments.php";
$config = config();
$route = $_GET["route"] ?? "";
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: no-referrer");
header("X-Frame-Options: DENY");
header("Cache-Control: no-store");
header(
    "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
);
if (($config["environment"] ?? "staging") !== "production" || $route !== "") {
    header("X-Robots-Tag: noindex, nofollow");
}
ini_set("session.use_strict_mode", "1");
session_name("moosing_" . substr(hash("sha256", __DIR__), 0, 8));
session_set_cookie_params([
    "secure" => !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off",
    "httponly" => true,
    "samesite" => "Strict",
    "path" => parse_url($config["base_url"] ?? "/", PHP_URL_PATH) ?: "/",
]);
session_start();
if ($route === "") {
    readfile(__DIR__ . "/shell.html");
    exit();
}
header("Content-Type: application/json");
try {
    need(
        strlen($_SERVER["CONTENT_LENGTH"] ?? "") < 12 &&
            (int) ($_SERVER["CONTENT_LENGTH"] ?? 0) <= 1048576,
        "Request too large",
    );
    $raw = file_get_contents("php://input");
    $method = $_SERVER["REQUEST_METHOD"];
    if ($route === "webhook") {
        need($method === "POST", "POST required");
        $event = Moosing\verifySignature(
            $raw,
            $_SERVER["HTTP_STRIPE_SIGNATURE"] ?? "",
            $config["stripe_webhook_secret"] ?? "",
        );
        echo json(Moosing\processEvent(db($config), $event));
        exit();
    }
    $input =
        $raw !== "" ? json_decode($raw, true, 64, JSON_THROW_ON_ERROR) : [];
    need(is_array($input), "Invalid request");
    $_SESSION["csrf"] ??= uid();
    if ($route === "session") {
        echo json([
            "authenticated" =>
                !empty($_SESSION["owner"]) &&
                ($_SESSION["expires"] ?? 0) > time(),
            "configured" => !empty($config["password_hash"]),
            "csrf" => $_SESSION["csrf"],
            "environment" => $config["environment"] ?? "staging",
        ]);
        exit();
    }
    if ($method !== "GET") {
        need(
            hash_equals($_SESSION["csrf"], $_SERVER["HTTP_X_CSRF_TOKEN"] ?? ""),
            "Invalid CSRF token",
        );
    }
    if ($route === "login") {
        need($method === "POST", "POST required");
        need(!empty($config["password_hash"]), "Owner account not configured");
        $db = db($config);
        $bucket = hash("sha256", $_SERVER["REMOTE_ADDR"] ?? "unknown");
        $attempt = query($db, "SELECT * FROM login_attempts WHERE bucket=?", [
            $bucket,
        ])->fetch();
        need(
            !$attempt ||
                (int) $attempt["reset_at"] < time() ||
                (int) $attempt["attempts"] < 8,
            "Too many attempts; wait 15 minutes",
        );
        query(
            $db,
            "INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN reset_at<? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END",
            [$bucket, time() + 900, time(), time()],
        );
        need(
            password_verify($input["password"] ?? "", $config["password_hash"]),
            "Incorrect password",
        );
        query($db, "DELETE FROM login_attempts WHERE bucket=?", [$bucket]);
        session_regenerate_id(true);
        $_SESSION["owner"] = true;
        $_SESSION["expires"] = time() + 28800;
        $_SESSION["csrf"] = uid();
        echo json(["ok" => true]);
        exit();
    }
    if (empty($_SESSION["owner"]) || ($_SESSION["expires"] ?? 0) < time()) {
        http_response_code(401);
        echo json(["error" => "Sign in to access the private workspace"]);
        exit();
    }
    $db = db($config);
    if ($route === "snapshot" && $method === "GET") {
        echo json(Moosing\snapshot($db, $config));
        exit();
    }
    need($method === "POST", "POST required");
    $result = match ($route) {
        "logout" => (function () {
            $_SESSION = [];
            session_destroy();
            return ["ok" => true];
        })(),
        "opportunity" => Moosing\saveOpportunity($db, $input),
        "stage" => (function () use ($db, $input) {
            Moosing\stage(
                $db,
                $input["id"] ?? "",
                $input["stage"] ?? "",
                $input["reason"] ?? "",
            );
            return ["ok" => true];
        })(),
        "record" => Moosing\saveRecord($db, $input),
        "evidence" => (function () use ($db, $input) {
            $db->beginTransaction();
            try {
                $r = Moosing\addEvidence($db, $input);
                if (!empty($input["opportunity_id"])) {
                    Moosing\linkEvidence(
                        $db,
                        $input["opportunity_id"],
                        $r["id"],
                    );
                }
                $db->commit();
                return $r;
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
        })(),
        "link" => (function () use ($db, $input) {
            Moosing\linkEvidence(
                $db,
                $input["opportunity_id"],
                $input["evidence_id"],
            );
            return ["ok" => true];
        })(),
        "verify" => (function () use ($db, $input) {
            $r = query($db, "SELECT * FROM evidence WHERE id=?", [
                $input["id"] ?? "",
            ])->fetch();
            need((bool) $r, "Evidence not found");
            $d = json_decode($r["data"], true);
            need(
                in_array(
                    $input["verification"] ?? "",
                    [
                        "unverified",
                        "discovery lead",
                        "verified original",
                        "direct account",
                        "repost",
                    ],
                    true,
                ),
                "Invalid verification",
            );
            need(
                trim($input["quality"] ?? "") !== "",
                "Explain your verification decision",
            );
            $d["verification"] = $input["verification"];
            $d["quality"] = Moosing\text($input, "quality");
            query($db, "UPDATE evidence SET data=? WHERE id=?", [
                json($d),
                $r["id"],
            ]);
            return ["ok" => true];
        })(),
        "import" => Moosing\importEvidence($db, $input["rows"] ?? []),
        "source" => (function () use ($db, $input) {
            need(
                ($input["id"] ?? "") === "stackexchange",
                "Source unavailable",
            );
            need(
                (int) ($input["daily_limit"] ?? 0) >= 1 &&
                    (int) $input["daily_limit"] <= 20,
                "Daily cap must be 1–20",
            );
            query(
                $db,
                "UPDATE sources SET enabled=?,daily_limit=? WHERE id=?",
                [
                    !empty($input["enabled"]) ? 1 : 0,
                    (int) $input["daily_limit"],
                    "stackexchange",
                ],
            );
            return ["ok" => true];
        })(),
        "collect" => [
            "job_id" => Moosing\enqueue($db, $input["profile_id"] ?? ""),
        ],
        "run" => Moosing\runJob($db),
        "checkout" => Moosing\checkout($db, $config, $input),
        default => throw new RuntimeException("Unknown action"),
    };
    echo json($result);
} catch (Throwable $e) {
    http_response_code(400);
    $safe = $e instanceof RuntimeException && !($e instanceof PDOException);
    echo json([
        "error" => $safe
            ? $e->getMessage()
            : "Request failed. Check configuration or input; no success was recorded.",
    ]);
}
