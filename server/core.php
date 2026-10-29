<?php
declare(strict_types=1);
namespace Moosing;

use PDO;
use RuntimeException;

const STAGES = [
    "Investigating",
    "Talking to Buyers",
    "Offer Made",
    "Paid Pilot",
    "Building",
    "Live",
    "Archived",
];
const WEIGHTS = [
    "economic_loss" => 25,
    "reachability" => 25,
    "pain" => 15,
    "simplicity" => 15,
    "alternatives" => 10,
    "contribution" => 10,
];
function uid(): string
{
    return bin2hex(random_bytes(12));
}
function now(): string
{
    return gmdate("c");
}
function json(array $data): string
{
    return json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
}
function unpacked(array $row): array
{
    $row["data"] = json_decode($row["data"], true, 64, JSON_THROW_ON_ERROR);
    return $row;
}
function config(): array
{
    $path = getenv("MOOSING_CONFIG") ?: __DIR__ . "/config.local.php";
    return is_file($path) ? require $path : [];
}
function db(array $config): PDO
{
    $path =
        $config["database"] ?? dirname(__DIR__) . "/storage/workspace.sqlite";
    if (!is_dir(dirname($path))) {
        mkdir(dirname($path), 0700, true);
    }
    $db = new PDO("sqlite:" . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec(
        "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
    );
    $db->exec(file_get_contents(__DIR__ . "/schema.sql"));
    return $db;
}
function query(PDO $db, string $sql, array $params = []): \PDOStatement
{
    $s = $db->prepare($sql);
    $s->execute($params);
    return $s;
}
function need(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}
function text(array $data, string $key, int $max = 10000): string
{
    $value = $data[$key] ?? "";
    need(is_string($value), "Invalid " . $key);
    need(strlen($value) <= $max, "Too long: " . $key);
    return trim($value);
}
function url(string $value): string
{
    if ($value === "") {
        return "";
    }
    $p = parse_url($value);
    need(
        is_array($p) &&
            in_array($p["scheme"] ?? "", ["https", "http"], true) &&
            isset($p["host"]) &&
            !isset($p["user"]) &&
            !isset($p["pass"]),
        "Use an HTTP(S) URL",
    );
    $query = [];
    parse_str($p["query"] ?? "", $query);
    foreach (array_keys($query) as $k) {
        if (preg_match('/^(utm_|fbclid$|gclid$)/i', $k)) {
            unset($query[$k]);
        }
    }
    ksort($query);
    return strtolower($p["scheme"]) .
        "://" .
        strtolower($p["host"]) .
        (isset($p["port"]) ? ":" . $p["port"] : "") .
        (rtrim($p["path"] ?? "", "/") ?: "") .
        ($query ? "?" . http_build_query($query) : "");
}
function getOpportunity(PDO $db, string $id): array
{
    $o = query($db, "SELECT * FROM opportunities WHERE id=?", [$id])->fetch();
    need((bool) $o, "Opportunity not found");
    return unpacked($o);
}
function assessment(PDO $db, string $id, array $data): array
{
    $coverage = 0;
    $score = 0;
    foreach (WEIGHTS as $key => $weight) {
        $a = $data["assessment"][$key] ?? null;
        if (!$a || ($a["rating"] ?? "") === "") {
            continue;
        }
        need(
            is_numeric($a["rating"]) &&
                $a["rating"] >= 0 &&
                $a["rating"] <= 4 &&
                floor((float) $a["rating"]) == (float) $a["rating"],
            "Ratings must be integers 0–4",
        );
        $ids = $a["evidence_ids"] ?? [];
        need(
            is_array($ids) && count($ids) > 0,
            "A known rating needs supporting evidence",
        );
        foreach ($ids as $e) {
            need(
                (bool) query(
                    $db,
                    "SELECT 1 FROM evidence_links WHERE opportunity_id=? AND evidence_id=?",
                    [$id, $e],
                )->fetchColumn(),
                "Assessment evidence must be linked",
            );
        }
        $coverage += $weight;
        $score += ($weight * (float) $a["rating"]) / 4;
    }
    return [
        "coverage" => $coverage,
        "score" => $coverage === 100 ? $score : null,
    ];
}
function saveOpportunity(PDO $db, array $data): array
{
    $id = text($data, "id", 100) ?: uid();
    $title = text($data, "title", 200);
    need($title !== "", "Name the opportunity");
    $existing = query($db, "SELECT * FROM opportunities WHERE id=?", [
        $id,
    ])->fetch();
    $stage = $existing["stage"] ?? "Investigating";
    unset($data["id"], $data["stage"]);
    if ($existing) {
        assessment($db, $id, $data);
    } else {
        foreach ($data["assessment"] ?? [] as $a) {
            need(
                !isset($a["rating"]) || $a["rating"] === "",
                "Link evidence before assessing",
            );
        }
    }
    query(
        $db,
        "INSERT INTO opportunities VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,data=excluded.data,updated_at=excluded.updated_at",
        [$id, $title, json($data), $stage, now(), now()],
    );
    return getOpportunity($db, $id);
}
function stage(PDO $db, string $id, string $stage, string $reason): void
{
    $o = getOpportunity($db, $id);
    need(in_array($stage, STAGES, true), "Unknown stage");
    need(trim($reason) !== "", "Record a reason");
    $db->beginTransaction();
    query($db, "UPDATE opportunities SET stage=?,updated_at=? WHERE id=?", [
        $stage,
        now(),
        $id,
    ]);
    query($db, "INSERT INTO history VALUES (?,?,?,?,?)", [
        uid(),
        $id,
        "stage",
        json([
            "from" => $o["stage"],
            "to" => $stage,
            "reason" => $reason,
            "payment_verified" => false,
        ]),
        now(),
    ]);
    $db->commit();
}
function addEvidence(PDO $db, array $data, string $method = "manual"): array
{
    $note = text($data, "note");
    need($note !== "", "Evidence needs a permitted excerpt or researcher note");
    $permission = text($data, "permission", 1000);
    need($permission !== "", "Describe your right to retain this evidence");
    $source = text($data, "source", 100) ?: "First-party research";
    $sourceId = text($data, "source_id", 200);
    $u = url(text($data, "url", 2000));
    $hash = hash(
        "sha256",
        strtolower(preg_replace("/\s+/u", " ", trim($note))),
    );
    $fingerprint = hash(
        "sha256",
        $sourceId !== "" ? $source . ":" . $sourceId : ($u !== "" ? $u : $hash),
    );
    $existing = query(
        $db,
        "SELECT id FROM evidence WHERE fingerprint=? OR content_hash=? OR (canonical_url=? AND canonical_url IS NOT NULL)",
        [$fingerprint, $hash, $u ?: null],
    )->fetchColumn();
    if ($existing) {
        return ["id" => $existing, "inserted" => false];
    }
    $data["method"] = $method;
    $data["url"] = $u;
    $data["verification"] = $data["verification"] ?? "unverified";
    need(
        in_array(
            $data["verification"],
            [
                "unverified",
                "discovery lead",
                "verified original",
                "direct account",
                "repost",
            ],
            true,
        ),
        "Unknown verification state",
    );
    $date = text($data, "published_at", 100);
    need(
        $date === "" || strtotime($date) !== false,
        "Invalid publication date",
    );
    $id = uid();
    query($db, "INSERT INTO evidence VALUES (?,?,?,?,?,?,?,?)", [
        $id,
        $source,
        $sourceId ?: null,
        $u ?: null,
        $fingerprint,
        $hash,
        json($data),
        now(),
    ]);
    return ["id" => $id, "inserted" => true];
}
function linkEvidence(PDO $db, string $opportunity, string $evidence): void
{
    query($db, "INSERT OR IGNORE INTO evidence_links VALUES (?,?)", [
        $opportunity,
        $evidence,
    ]);
}
function importEvidence(PDO $db, array $rows): array
{
    need(count($rows) <= 200, "Import at most 200 records");
    $db->beginTransaction();
    $added = 0;
    $duplicates = 0;
    try {
        foreach ($rows as $row) {
            need(is_array($row), "Invalid import row");
            $r = addEvidence($db, $row, "import");
            $r["inserted"] ? $added++ : $duplicates++;
            if (!empty($row["opportunity_id"])) {
                linkEvidence($db, $row["opportunity_id"], $r["id"]);
            }
        }
        $db->commit();
    } catch (\Throwable $e) {
        $db->rollBack();
        throw $e;
    }
    return compact("added", "duplicates");
}
function saveRecord(PDO $db, array $input): array
{
    $kind = text($input, "kind", 30);
    need(
        in_array(
            $kind,
            [
                "profile",
                "experiment",
                "interview",
                "offer",
                "alternative",
                "brief",
                "decision",
                "product",
                "cost",
            ],
            true,
        ),
        "Unknown record type",
    );
    $data = $input["data"] ?? [];
    need(is_array($data), "Invalid record");
    $id = text($input, "id", 100) ?: uid();
    $opportunity = text($input, "opportunity_id", 100);
    if ($opportunity !== "") {
        getOpportunity($db, $opportunity);
    }
    need(
        $kind === "profile" || $opportunity !== "",
        "Link this record to an opportunity",
    );
    foreach (["url"] as $key) {
        if (!empty($data[$key])) {
            $data[$key] = url($data[$key]);
        }
    }
    need(!empty($data["title"]), "Name the record");
    $prior = query($db, "SELECT kind,opportunity_id FROM records WHERE id=?", [
        $id,
    ])->fetch();
    if ($prior) {
        need(
            $prior["kind"] === $kind &&
                $prior["opportunity_id"] === ($opportunity ?: null),
            "Record identity cannot change",
        );
    }
    if (!empty($data["evidence_ids"])) {
        $ids = is_array($data["evidence_ids"])
            ? $data["evidence_ids"]
            : array_filter(
                array_map("trim", explode(",", $data["evidence_ids"])),
            );
        foreach ($ids as $e) {
            need(
                (bool) query(
                    $db,
                    "SELECT 1 FROM evidence_links WHERE opportunity_id=? AND evidence_id=?",
                    [$opportunity, $e],
                )->fetchColumn(),
                "Claims must reference linked evidence",
            );
        }
        $data["evidence_ids"] = $ids;
    }
    if ($kind === "offer") {
        need(
            ($data["mode"] ?? "sandbox") === "sandbox",
            "Live offers are disabled pending approval",
        );
        need(
            isset($data["amount"]) &&
                filter_var($data["amount"], FILTER_VALIDATE_INT) !== false &&
                $data["amount"] > 0,
            "Amount must be positive integer cents",
        );
        need(
            preg_match('/^[a-z]{3}$/', $data["currency"] ?? "") === 1,
            "Use a three-letter currency",
        );
        $data["approved"] = false;
    }
    if ($kind === "product") {
        need(
            !isset($data["revenue"]) && !isset($data["paid_customers"]),
            "Revenue comes from verified payments",
        );
        need(
            (bool) query(
                $db,
                "SELECT 1 FROM records WHERE id=? AND kind='experiment' AND opportunity_id=?",
                [$data["experiment_id"] ?? "", $opportunity],
            )->fetchColumn(),
            "Link the originating experiment for this opportunity",
        );
    }
    query(
        $db,
        "INSERT INTO records VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
        [$id, $kind, $opportunity ?: null, json($data), now(), now()],
    );
    if ($opportunity) {
        query($db, "INSERT INTO history VALUES (?,?,?,?,?)", [
            uid(),
            $opportunity,
            $kind,
            json(["record_id" => $id, "title" => $data["title"]]),
            now(),
        ]);
    }
    return ["id" => $id];
}
function snapshot(PDO $db, array $config): array
{
    $opportunities = array_map(
        "Moosing\\unpacked",
        query(
            $db,
            "SELECT * FROM opportunities ORDER BY updated_at DESC",
        )->fetchAll(),
    );
    foreach ($opportunities as &$o) {
        $o["assessment"] = assessment($db, $o["id"], $o["data"]);
        $o["evidence_count"] = (int) query(
            $db,
            "SELECT COUNT(*) FROM evidence_links l JOIN evidence e ON e.id=l.evidence_id WHERE l.opportunity_id=? AND json_extract(e.data,'$.verification') IN ('verified original','direct account')",
            [$o["id"]],
        )->fetchColumn();
    }
    return [
        "opportunities" => $opportunities,
        "evidence" => array_map(
            "Moosing\\unpacked",
            query(
                $db,
                "SELECT * FROM evidence ORDER BY collected_at DESC",
            )->fetchAll(),
        ),
        "links" => query($db, "SELECT * FROM evidence_links")->fetchAll(),
        "records" => array_map(
            "Moosing\\unpacked",
            query(
                $db,
                "SELECT * FROM records ORDER BY updated_at DESC",
            )->fetchAll(),
        ),
        "history" => array_map(
            "Moosing\\unpacked",
            query(
                $db,
                "SELECT * FROM history ORDER BY created_at DESC",
            )->fetchAll(),
        ),
        "sources" => query($db, "SELECT * FROM sources")->fetchAll(),
        "jobs" => query(
            $db,
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50",
        )->fetchAll(),
        "payments" => query(
            $db,
            "SELECT id,product_id,offer_id,experiment_id,amount,currency,mode,state,refunded,fulfilled_at FROM checkouts",
        )->fetchAll(),
        "integrations" => [
            "stripe" =>
                !empty($config["stripe_key"]) &&
                !empty($config["stripe_webhook_secret"])
                    ? "Sandbox configured; delivery must be verified"
                    : "Disconnected — runtime credentials required",
            "model" => "Unavailable — no authorized model configured",
            "live_selling" => false,
        ],
        "stages" => STAGES,
        "weights" => WEIGHTS,
    ];
}
