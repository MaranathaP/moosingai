<?php
declare(strict_types=1);
namespace Moosing;
use PDO;
function stripeClient(array $config): \Stripe\StripeClient
{
    need(
        is_file(dirname(__DIR__) . "/vendor/autoload.php"),
        "Stripe SDK unavailable",
    );
    require_once dirname(__DIR__) . "/vendor/autoload.php";
    need(
        !empty($config["stripe_key"]) &&
            preg_match("/^[sr]k_test_/", $config["stripe_key"]) === 1,
        "Sandbox runtime key required; live selling disabled",
    );
    return new \Stripe\StripeClient([
        "api_key" => $config["stripe_key"],
        "stripe_version" => "2026-09-30.endive",
    ]);
}
function checkout(PDO $db, array $config, array $input): array
{
    $client = stripeClient($config);
    need(
        !empty($config["stripe_webhook_secret"]),
        "Configure signed webhooks before Checkout",
    );
    $records = [];
    foreach (["offer", "product", "experiment"] as $kind) {
        $r = query($db, "SELECT * FROM records WHERE id=? AND kind=?", [
            $input[$kind . "_id"] ?? "",
            $kind,
        ])->fetch();
        need((bool) $r, "Missing " . $kind);
        $records[$kind] = unpacked($r);
    }
    need(
        $records["offer"]["opportunity_id"] ===
            $records["product"]["opportunity_id"] &&
            $records["offer"]["opportunity_id"] ===
                $records["experiment"]["opportunity_id"],
        "Records must belong to the same opportunity",
    );
    $offer = $records["offer"]["data"];
    need(($offer["mode"] ?? "sandbox") === "sandbox", "Live selling disabled");
    $requestId = text($input, "request_id", 100);
    need(
        preg_match('/^[a-f0-9]{24}$/', $requestId) === 1,
        "Checkout request ID required",
    );
    $existing = query($db, "SELECT * FROM checkouts WHERE id=?", [
        $requestId,
    ])->fetch();
    if ($existing) {
        need(
            $existing["offer_id"] === $records["offer"]["id"] &&
                $existing["product_id"] === $records["product"]["id"] &&
                $existing["experiment_id"] === $records["experiment"]["id"],
            "Checkout ID already used",
        );
    } else {
        query(
            $db,
            "INSERT INTO checkouts(id,offer_id,product_id,experiment_id,amount,currency,mode,created_at) VALUES (?,?,?,?,?,?,?,?)",
            [
                $requestId,
                $records["offer"]["id"],
                $records["product"]["id"],
                $records["experiment"]["id"],
                (int) $offer["amount"],
                $offer["currency"],
                "sandbox",
                now(),
            ],
        );
    }
    $row = query($db, "SELECT * FROM checkouts WHERE id=?", [
        $requestId,
    ])->fetch();
    $params = [
        "mode" => "payment",
        "line_items" => [
            [
                "price_data" => [
                    "currency" => $row["currency"],
                    "unit_amount" => (int) $row["amount"],
                    "product_data" => [
                        "name" => "SANDBOX fixture: " . $offer["title"],
                    ],
                ],
                "quantity" => 1,
            ],
        ],
        "client_reference_id" => $requestId,
        "metadata" => [
            "checkout_id" => $requestId,
            "offer_id" => $row["offer_id"],
            "product_id" => $row["product_id"],
            "experiment_id" => $row["experiment_id"],
        ],
        "success_url" => $config["base_url"] . "/?payment=returned",
        "cancel_url" => $config["base_url"] . "/?payment=cancelled",
        "integration_identifier" =>
            "moosingai_" .
            substr(strtr($requestId, "0123456789", "abcdefghij"), 0, 8),
    ];
    $session = $client->checkout->sessions->create($params, [
        "idempotency_key" => "checkout-" . $requestId,
    ]);
    need(!$session->livemode, "Live sessions rejected");
    query($db, "UPDATE checkouts SET session_id=? WHERE id=?", [
        $session->id,
        $requestId,
    ]);
    return ["url" => $session->url];
}
function verifySignature(
    string $raw,
    string $signature,
    string $secret,
    ?int $clock = null,
): array {
    need($secret !== "", "Webhook signing secret unavailable");
    $timestamp = 0;
    $signatures = [];
    foreach (explode(",", $signature) as $part) {
        $pair = explode("=", $part, 2);
        if (count($pair) !== 2) {
            continue;
        }
        if ($pair[0] === "t") {
            $timestamp = (int) $pair[1];
        }
        if ($pair[0] === "v1") {
            $signatures[] = $pair[1];
        }
    }
    need(
        abs(($clock ?? time()) - $timestamp) <= 300,
        "Webhook timestamp outside tolerance",
    );
    $expected = hash_hmac("sha256", $timestamp . "." . $raw, $secret);
    $valid = false;
    foreach ($signatures as $s) {
        if (hash_equals($expected, $s)) {
            $valid = true;
        }
    }
    need($valid, "Invalid webhook signature");
    return json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
}
function processEvent(PDO $db, array $event): array
{
    need(
        isset(
            $event["id"],
            $event["type"],
            $event["livemode"],
            $event["data"]["object"],
        ),
        "Invalid event",
    );
    need($event["livemode"] === false, "Live events disabled");
    $db->beginTransaction();
    try {
        if (
            query($db, "SELECT 1 FROM payment_events WHERE id=?", [
                $event["id"],
            ])->fetchColumn()
        ) {
            $db->rollBack();
            return ["duplicate" => true];
        }
        $o = $event["data"]["object"];
        $type = $event["type"];
        if (
            in_array(
                $type,
                [
                    "checkout.session.completed",
                    "checkout.session.async_payment_succeeded",
                    "checkout.session.async_payment_failed",
                    "checkout.session.expired",
                ],
                true,
            )
        ) {
            $row = query($db, "SELECT * FROM checkouts WHERE session_id=?", [
                $o["id"],
            ])->fetch();
            // Unknown sessions are not ours; they cannot create revenue or fulfillment.
            if ($row) {
                need(
                    ($o["metadata"]["checkout_id"] ?? "") === $row["id"] &&
                        ($o["metadata"]["offer_id"] ?? "") ===
                            $row["offer_id"] &&
                        ($o["metadata"]["product_id"] ?? "") ===
                            $row["product_id"] &&
                        ($o["metadata"]["experiment_id"] ?? "") ===
                            $row["experiment_id"],
                    "Checkout metadata mismatch",
                );
                need(
                    (int) ($o["amount_total"] ?? -1) === (int) $row["amount"] &&
                        ($o["currency"] ?? "") === $row["currency"],
                    "Payment amount mismatch",
                );
                if (
                    in_array(
                        $type,
                        [
                            "checkout.session.completed",
                            "checkout.session.async_payment_succeeded",
                        ],
                        true,
                    ) &&
                    ($o["payment_status"] ?? "") === "paid"
                ) {
                    query(
                        $db,
                        "UPDATE checkouts SET state='paid',payment_intent=?,customer_id=?,fulfilled_at=COALESCE(fulfilled_at,?) WHERE id=?",
                        [
                            $o["payment_intent"] ?? null,
                            $o["customer"] ?? null,
                            now(),
                            $row["id"],
                        ],
                    );
                    query(
                        $db,
                        "UPDATE checkouts SET refunded=MIN(amount,COALESCE((SELECT amount FROM refunds WHERE payment_intent=checkouts.payment_intent),0)) WHERE id=?",
                        [$row["id"]],
                    );
                } elseif (
                    $row["state"] !== "paid" &&
                    in_array(
                        $type,
                        [
                            "checkout.session.async_payment_failed",
                            "checkout.session.expired",
                        ],
                        true,
                    )
                ) {
                    query(
                        $db,
                        "UPDATE checkouts SET state='failed' WHERE id=?",
                        [$row["id"]],
                    );
                }
            }
        } elseif ($type === "charge.refunded") {
            need(
                is_string($o["payment_intent"] ?? null) &&
                    (int) ($o["amount_refunded"] ?? -1) >= 0,
                "Invalid refund",
            );
            query(
                $db,
                "INSERT INTO refunds VALUES (?,?) ON CONFLICT(payment_intent) DO UPDATE SET amount=MAX(amount,excluded.amount)",
                [$o["payment_intent"], (int) $o["amount_refunded"]],
            );
            query(
                $db,
                "UPDATE checkouts SET refunded=MIN(amount,MAX(refunded,CAST(? AS INTEGER))) WHERE payment_intent=? AND mode=?",
                [
                    (int) ($o["amount_refunded"] ?? 0),
                    $o["payment_intent"] ?? "",
                    "sandbox",
                ],
            );
        }
        query($db, "INSERT INTO payment_events VALUES (?,?,?,?)", [
            $event["id"],
            "sandbox",
            $type,
            now(),
        ]);
        $db->commit();
        return ["received" => true];
    } catch (\Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}
