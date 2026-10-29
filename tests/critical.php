<?php
declare(strict_types=1);
namespace Moosing;
require dirname(__DIR__) . "/server/core.php";
require dirname(__DIR__) . "/server/collection.php";
require dirname(__DIR__) . "/server/payments.php";
$temp = tempnam(sys_get_temp_dir(), "moosing-test");
$db = db(["database" => $temp]);
$passed = 0;
function check(bool $ok, string $label): void
{
    global $passed;
    if (!$ok) {
        throw new \RuntimeException("FAIL: " . $label);
    }
    $passed++;
    echo "PASS $label\n";
}
function rejects(callable $f, string $label): void
{
    try {
        $f();
    } catch (\Throwable $e) {
        check(true, $label);
        return;
    }
    check(false, $label);
}
try {
    $o = saveOpportunity($db, [
        "title" => "TEST fixture — recurring import",
        "buyer" => "Test buyer",
        "task" => "Repeated test task",
    ]);
    $id = $o["id"];
    check(
        getOpportunity(db(["database" => $temp]), $id)["title"] === $o["title"],
        "opportunity survives new database connection",
    );
    check(
        assessment($db, $id, []) === ["coverage" => 0, "score" => null],
        "unknown ratings remain incomplete",
    );
    $ev = [
        "source" => "Consented test fixture",
        "note" => "TEST ONLY: researcher observed a repeated task",
        "permission" => "Synthetic fixture owned by test suite",
        "url" => "https://example.com/report?utm_source=test",
        "verification" => "direct account",
    ];
    $a = addEvidence($db, $ev);
    $b = addEvidence($db, [...$ev, "url" => "https://example.com/report"]);
    check($a["inserted"] && !$b["inserted"], "canonical URL deduplicates");
    $c = addEvidence($db, [...$ev, "url" => "https://example.com/repost"]);
    check(!$c["inserted"], "reposted content deduplicates");
    linkEvidence($db, $id, $a["id"]);
    linkEvidence($db, $id, $a["id"]);
    check(
        (int) query(
            $db,
            "SELECT COUNT(*) FROM evidence_links",
        )->fetchColumn() === 1,
        "duplicate linking does not inflate demand",
    );
    $r = importEvidence($db, [$ev, $ev]);
    check(
        $r["added"] === 0 && $r["duplicates"] === 2,
        "reimport does not inflate evidence",
    );
    rejects(
        fn() => importEvidence($db, [
            ["note" => "valid new", "permission" => "owned"],
            ["note" => "missing rights"],
        ]),
        "invalid batch rejects atomically",
    );
    check(
        (int) query($db, "SELECT COUNT(*) FROM evidence")->fetchColumn() === 1,
        "invalid batch rolls back",
    );
    rejects(fn() => url("javascript:alert(1)"), "unsafe URL rejected");
    rejects(
        fn() => addEvidence($db, ["note" => "private text"]),
        "evidence rights required",
    );
    rejects(
        fn() => assessment($db, $id, [
            "assessment" => [
                "pain" => ["rating" => 4, "evidence_ids" => ["missing"]],
            ],
        ]),
        "unsupported assessment rejected",
    );
    $as = assessment($db, $id, [
        "assessment" => [
            "pain" => ["rating" => 4, "evidence_ids" => [$a["id"]]],
        ],
    ]);
    check(
        $as["coverage"] === 15 && $as["score"] === null,
        "partial assessment has coverage but no rank",
    );
    stage($db, $id, "Paid Pilot", "Test stage is a decision only");
    check(
        (int) query($db, "SELECT COUNT(*) FROM checkouts")->fetchColumn() === 0,
        "Paid Pilot stage cannot fabricate revenue",
    );
    stage($db, $id, "Archived", "Synthetic no-go");
    stage($db, $id, "Investigating", "Revisit fixture");
    check(
        (int) query($db, "SELECT COUNT(*) FROM history")->fetchColumn() === 3,
        "stage changes and archive/reopen persist",
    );
    $interview = saveRecord($db, [
        "kind" => "interview",
        "opportunity_id" => $id,
        "data" => [
            "title" => "Synthetic interview",
            "notes" => "Observed workaround",
        ],
    ]);
    check(
        (bool) query($db, "SELECT 1 FROM records WHERE id=?", [
            $interview["id"],
        ])->fetchColumn(),
        "interview persists",
    );
    $profile = saveRecord($db, [
        "kind" => "profile",
        "data" => ["title" => "Test profile", "phrases" => "csv"],
    ]);
    rejects(
        fn() => enqueue($db, $profile["id"]),
        "disabled source blocks collection",
    );
    query(
        $db,
        "UPDATE sources SET enabled=1,last_success='2026-01-01T00:00:00Z'",
    );
    enqueue($db, $profile["id"]);
    rejects(fn() => enqueue($db, $profile["id"]), "pending job deduplicates");
    $bad = new class implements SourceAdapter {
        public function collect(array $p): array
        {
            throw new \RuntimeException("Failure");
        }
    };
    for ($i = 0; $i < 3; $i++) {
        query($db, "UPDATE sources SET next_run=0");
        $result = runJob($db, $bad);
    }
    check(
        $result["status"] === "failed",
        "collection retries bounded to three",
    );
    check(
        query($db, "SELECT last_success FROM sources")->fetchColumn() ===
            "2026-01-01T00:00:00Z",
        "failed collection preserves last success",
    );
    query($db, "UPDATE sources SET next_run=0");
    enqueue($db, $profile["id"]);
    $good = new class implements SourceAdapter {
        public function collect(array $p): array
        {
            return [
                "rows" => [
                    [
                        "source" => "Adapter test",
                        "note" => "Synthetic API fixture",
                        "permission" => "Owned fixture",
                        "verification" => "discovery lead",
                    ],
                ],
                "quota_remaining" => 0,
                "backoff" => 120,
            ];
        }
    };
    $result = runJob($db, $good);
    check(
        $result["status"] === "succeeded" && $result["added"] === 1,
        "successful adapter persists actual outcome",
    );
    check(
        (int) query($db, "SELECT next_run FROM sources")->fetchColumn() >
            time() + 80000,
        "exhausted API quota enforces backoff",
    );
    $offer = saveRecord($db, [
        "kind" => "offer",
        "opportunity_id" => $id,
        "data" => [
            "title" => "SANDBOX fixture",
            "amount" => 1000,
            "currency" => "usd",
            "mode" => "sandbox",
        ],
    ]);
    rejects(
        fn() => saveRecord($db, [
            "kind" => "offer",
            "opportunity_id" => $id,
            "data" => [
                "title" => "live test",
                "amount" => 1000,
                "currency" => "usd",
                "mode" => "live",
            ],
        ]),
        "live offers disabled",
    );
    $product = saveRecord($db, [
        "kind" => "product",
        "opportunity_id" => $id,
        "data" => ["title" => "SANDBOX product"],
    ]);
    $experiment = saveRecord($db, [
        "kind" => "experiment",
        "opportunity_id" => $id,
        "data" => ["title" => "SANDBOX experiment"],
    ]);
    $checkout = uid();
    query(
        $db,
        "INSERT INTO checkouts(id,offer_id,product_id,experiment_id,amount,currency,mode,session_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [
            $checkout,
            $offer["id"],
            $product["id"],
            $experiment["id"],
            1000,
            "usd",
            "sandbox",
            "cs_test_fixture",
            now(),
        ],
    );
    $object = [
        "id" => "cs_test_fixture",
        "amount_total" => 1000,
        "currency" => "usd",
        "payment_status" => "unpaid",
        "payment_intent" => "pi_fixture",
        "metadata" => [
            "checkout_id" => $checkout,
            "offer_id" => $offer["id"],
            "product_id" => $product["id"],
            "experiment_id" => $experiment["id"],
        ],
    ];
    $event = [
        "id" => "evt_unpaid",
        "type" => "checkout.session.completed",
        "livemode" => false,
        "data" => ["object" => $object],
    ];
    $raw = json($event);
    $secret = "synthetic-signing-secret";
    $sig =
        "t=" .
        time() .
        ",v1=" .
        hash_hmac("sha256", time() . "." . $raw, $secret);
    check(
        verifySignature($raw, $sig, $secret)["id"] === $event["id"],
        "raw signed body accepted",
    );
    rejects(
        fn() => verifySignature($raw . " ", $sig, $secret),
        "tampered payload rejected",
    );
    rejects(
        fn() => verifySignature($raw, $sig, $secret, time() + 301),
        "stale webhook rejected",
    );
    processEvent($db, $event);
    check(
        query($db, "SELECT state FROM checkouts")->fetchColumn() === "pending",
        "unpaid completed event cannot fulfill",
    );
    $event["id"] = "evt_paid";
    $event["type"] = "checkout.session.async_payment_succeeded";
    $event["data"]["object"]["payment_status"] = "paid";
    processEvent($db, $event);
    $fulfilled = query(
        $db,
        "SELECT fulfilled_at FROM checkouts",
    )->fetchColumn();
    check((bool) $fulfilled, "delayed successful payment fulfills");
    check(processEvent($db, $event)["duplicate"], "duplicate event idempotent");
    $event["id"] = "evt_paid_second";
    processEvent($db, $event);
    check(
        query($db, "SELECT fulfilled_at FROM checkouts")->fetchColumn() ===
            $fulfilled,
        "distinct success events do not duplicate fulfillment",
    );
    $refund = [
        "id" => "evt_refund",
        "type" => "charge.refunded",
        "livemode" => false,
        "data" => [
            "object" => [
                "payment_intent" => "pi_fixture",
                "amount_refunded" => 400,
            ],
        ],
    ];
    processEvent($db, $refund);
    processEvent($db, $refund);
    check(
        (int) query($db, "SELECT refunded FROM checkouts")->fetchColumn() ===
            400,
        "refund cumulative and idempotent",
    );
    $event["id"] = "evt_mismatch";
    $event["data"]["object"]["amount_total"] = 1;
    rejects(fn() => processEvent($db, $event), "mismatched payment rejected");
    check(
        !query($db, "SELECT 1 FROM payment_events WHERE id=?", [
            "evt_mismatch",
        ])->fetchColumn(),
        "failed event transaction rolls back",
    );
    $event["livemode"] = true;
    rejects(
        fn() => processEvent($db, $event),
        "live event cannot enter sandbox ledger",
    );
    $s = snapshot($db, []);
    check(
        $s["integrations"]["live_selling"] === false,
        "selling remains disabled",
    );
    check(
        $s["opportunities"][0]["evidence_count"] === 1,
        "discovery leads excluded from independent report count",
    );
    echo "\n$passed critical checks passed\n";
} finally {
    unset($db);
    @unlink($temp);
    @unlink($temp . "-wal");
    @unlink($temp . "-shm");
}
