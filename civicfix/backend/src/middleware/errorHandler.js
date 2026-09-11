export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.response?.status || 500;
  const message =
    err.response?.data?.error ||
    err.message ||
    "Something went wrong on the server.";
  res.status(status).json({ error: message });
}
