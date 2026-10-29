<?php
declare(strict_types=1);
// Run only from a trusted terminal. Reads password from stdin, never command arguments.
if (PHP_SAPI !== "cli") {
    exit(1);
}
$target = $argv[1] ?? dirname(__DIR__) . "/server/config.local.php";
if (is_file($target)) {
    fwrite(STDERR, "Configuration already exists; refusing overwrite\n");
    exit(1);
}
fwrite(STDERR, "Owner password (stdin; use a secure prompt): ");
$password = trim(fgets(STDIN));
if (strlen($password) < 16) {
    fwrite(STDERR, "Use at least 16 characters\n");
    exit(1);
}
$config = [
    "environment" => "staging",
    "base_url" => $argv[2] ?? "http://127.0.0.1:8088",
    "password_hash" => password_hash($password, PASSWORD_DEFAULT),
    "database" => dirname(__DIR__) . "/storage/workspace.sqlite",
    "stripe_key" => "",
    "stripe_webhook_secret" => "",
];
file_put_contents(
    $target,
    "<?php\nreturn " . var_export($config, true) . ";\n",
);
chmod($target, 0600);
fwrite(STDERR, "Configuration written. Keep it outside Git.\n");
