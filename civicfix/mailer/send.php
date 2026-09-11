<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

function envValue(string $key, ?string $default = null): ?string
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    return $value === false || $value === null || $value === '' ? $default : (string)$value;
}

function respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'POST required']);
}

$expectedSecret = envValue('MAILER_SHARED_SECRET');
$providedSecret = $_SERVER['HTTP_X_MAILER_SECRET'] ?? '';
if (!$expectedSecret || !hash_equals($expectedSecret, $providedSecret)) {
    respond(401, ['error' => 'Unauthorized']);
}

$body = json_decode(file_get_contents('php://input'), true);
$recipient = filter_var($body['to'] ?? '', FILTER_VALIDATE_EMAIL);
$subject = trim((string)($body['subject'] ?? ''));
$text = trim((string)($body['text'] ?? ''));

if (!$recipient || $subject === '' || $text === '' || strlen($subject) > 200 || strlen($text) > 10000) {
    respond(400, ['error' => 'Valid to, subject, and text fields are required']);
}

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = envValue('SMTP_HOST');
    $mail->Port = (int)envValue('SMTP_PORT', '587');
    $mail->SMTPAuth = true;
    $mail->Username = envValue('SMTP_USERNAME');
    $mail->Password = envValue('SMTP_PASSWORD');
    $mail->SMTPSecure = strtolower((string)envValue('SMTP_ENCRYPTION', 'tls')) === 'ssl'
        ? PHPMailer::ENCRYPTION_SMTPS
        : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom(
        (string)envValue('MAIL_FROM_ADDRESS', 'no-reply@civicfix.app'),
        (string)envValue('MAIL_FROM_NAME', 'E-Complaint System')
    );
    $mail->addReplyTo((string)envValue('MAIL_REPLY_TO', 'no-reply@civicfix.app'));
    $mail->addAddress($recipient);
    $mail->Subject = $subject;
    $mail->Body = $text;
    $mail->AltBody = $text;
    $mail->send();

    respond(200, ['sent' => true]);
} catch (Exception $error) {
    error_log('[mailer] delivery failed: ' . $error->getMessage());
    respond(502, ['error' => 'Email delivery failed']);
}
