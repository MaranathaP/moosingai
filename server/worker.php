<?php
declare(strict_types=1);
namespace Moosing;
require __DIR__ . "/core.php";
require __DIR__ . "/collection.php";
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}
$db = db(config());
foreach (
    query($db, "SELECT id,data FROM records WHERE kind='profile'")->fetchAll()
    as $p
) {
    $profile = json_decode($p["data"], true);
    if (empty($profile["schedule"])) {
        continue;
    }
    try {
        enqueue($db, $p["id"]);
    } catch (\RuntimeException $e) {
        /* quotas/backoff/pending jobs are expected */
    }
}
echo json(runJob($db)) . PHP_EOL;
