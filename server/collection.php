<?php
declare(strict_types=1);
namespace Moosing;
use PDO;
interface SourceAdapter
{
    public function collect(array $profile): array;
}
final class StackExchangeAdapter implements SourceAdapter
{
    public function collect(array $profile): array
    {
        $phrase = trim($profile["phrases"] ?? "");
        need($phrase !== "", "Add a search phrase to the research profile");
        $data = httpJson(
            "https://api.stackexchange.com/2.3/search/advanced?" .
                http_build_query([
                    "site" => "stackoverflow",
                    "q" => $phrase,
                    "pagesize" => 20,
                    "sort" => "creation",
                    "order" => "desc",
                    "fromdate" => strtotime("2018-05-03"),
                ]),
        );
        need(!isset($data["error_id"]), "Source rejected the query");
        $rows = [];
        foreach ($data["items"] ?? [] as $item) {
            $title = html_entity_decode(
                $item["title"],
                ENT_QUOTES | ENT_HTML5,
                "UTF-8",
            );
            $excluded = array_filter(
                array_map("trim", explode(",", $profile["exclusions"] ?? "")),
            );
            $skip = false;
            foreach ($excluded as $word) {
                if (stripos($title, $word) !== false) {
                    $skip = true;
                }
            }
            if ($skip) {
                continue;
            }
            $rows[] = [
                "source" => "Stack Exchange / Stack Overflow",
                "source_id" => (string) $item["question_id"],
                "url" => $item["link"],
                "note" => $title,
                "published_at" => gmdate("c", $item["creation_date"]),
                "buyer" => $profile["buyer"] ?? "",
                "task" => "",
                "workaround" => "",
                "frequency" => "",
                "spending" => "",
                "verification" => "discovery lead",
                "quality" =>
                    "Question title only; review original before counting demand",
                "author" => $item["owner"]["display_name"] ?? "Unknown author",
                "author_url" => $item["owner"]["link"] ?? "",
                "permission" =>
                    "Stack Exchange API; CC BY-SA 4.0; title unmodified; attributed original and author; no model processing",
                "license_url" =>
                    "https://creativecommons.org/licenses/by-sa/4.0/",
            ];
        }
        return [
            "rows" => $rows,
            "quota_remaining" => $data["quota_remaining"] ?? null,
            "backoff" => $data["backoff"] ?? 0,
        ];
    }
}
function httpJson(string $url): array
{
    // Callers construct fixed provider URLs. Never fetch user supplied URLs.
    $c = curl_init($url);
    $body = "";
    curl_setopt_array($c, [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_ENCODING => "",
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_USERAGENT => "MoosingAI/2.0 research (https://moosingai.com)",
        CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$body) {
            if (strlen($body) + strlen($chunk) > 1048576) {
                return 0;
            }
            $body .= $chunk;
            return strlen($chunk);
        },
    ]);
    $ok = curl_exec($c);
    $status = curl_getinfo($c, CURLINFO_RESPONSE_CODE);
    curl_close($c);
    need(
        $ok !== false && $status === 200,
        "Source request failed; no successful scan recorded",
    );
    return json_decode($body, true, 64, JSON_THROW_ON_ERROR);
}
function enqueue(PDO $db, string $profileId): string
{
    $profile = query(
        $db,
        "SELECT * FROM records WHERE id=? AND kind='profile'",
        [$profileId],
    )->fetch();
    need((bool) $profile, "Research profile required");
    $s = query($db, "SELECT * FROM sources WHERE id='stackexchange'")->fetch();
    need((bool) $s["enabled"], "Enable the permitted source first");
    need(time() >= (int) $s["next_run"], "Source backoff is active");
    $count = (int) query(
        $db,
        "SELECT COUNT(*) FROM jobs WHERE source_id='stackexchange' AND created_at>=?",
        [gmdate("Y-m-d") . "T00:00:00+00:00"],
    )->fetchColumn();
    need($count < (int) $s["daily_limit"], "Daily collection cap reached");
    need(
        !query(
            $db,
            "SELECT 1 FROM jobs WHERE source_id='stackexchange' AND status IN ('queued','running','retry')",
        )->fetchColumn(),
        "A collection is already pending",
    );
    $id = uid();
    query(
        $db,
        "INSERT INTO jobs(id,source_id,profile_id,status,created_at) VALUES (?,'stackexchange',?,'queued',?)",
        [$id, $profileId, now()],
    );
    return $id;
}
function runJob(PDO $db, ?SourceAdapter $adapter = null): array
{
    $db->exec("BEGIN IMMEDIATE");
    $j = query(
        $db,
        "SELECT j.* FROM jobs j JOIN sources s ON s.id=j.source_id WHERE s.enabled=1 AND s.next_run<=? AND (j.status IN ('queued','retry') OR (j.status='running' AND j.lease_until<?)) ORDER BY j.created_at LIMIT 1",
        [time(), time()],
    )->fetch();
    if (!$j) {
        $db->exec("COMMIT");
        return ["status" => "idle"];
    }
    query(
        $db,
        "UPDATE jobs SET status='running',attempts=attempts+1,lease_until=? WHERE id=?",
        [time() + 60, $j["id"]],
    );
    $db->exec("COMMIT");
    try {
        $p = unpacked(
            query($db, "SELECT * FROM records WHERE id=?", [
                $j["profile_id"],
            ])->fetch(),
        );
        $result = ($adapter ?? new StackExchangeAdapter())->collect($p["data"]);
        $db->beginTransaction();
        $added = 0;
        foreach ($result["rows"] as $row) {
            if (addEvidence($db, $row, "api")["inserted"]) {
                $added++;
            }
        }
        query(
            $db,
            "UPDATE jobs SET status='succeeded',added=?,error=NULL,completed_at=?,lease_until=0 WHERE id=?",
            [$added, now(), $j["id"]],
        );
        $quota = $result["quota_remaining"];
        $delay = max(60, (int) ($result["backoff"] ?? 0));
        if ($quota !== null && $quota < 1) {
            $delay = max($delay, 86400);
        }
        query(
            $db,
            "UPDATE sources SET last_success=?,last_error=NULL,next_run=?,quota_remaining=? WHERE id=?",
            [now(), time() + $delay, $quota, $j["source_id"]],
        );
        $db->commit();
        return ["status" => "succeeded", "added" => $added];
    } catch (\Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        $status = (int) $j["attempts"] + 1 >= 3 ? "failed" : "retry";
        // Provider errors and collected text never enter logs or HTML exception messages.
        query(
            $db,
            "UPDATE jobs SET status=?,error=?,lease_until=0,completed_at=? WHERE id=?",
            [
                $status,
                "Collection failed; check access, query and quota",
                now(),
                $j["id"],
            ],
        );
        query($db, "UPDATE sources SET last_error=?,next_run=? WHERE id=?", [
            "Collection failed; last success unchanged",
            time() + 300,
            $j["source_id"],
        ]);
        return ["status" => $status];
    }
}
