import app from "./app";

console.log("=== Environment Check ===");
console.log("R2_ENDPOINT:", process.env.R2_ENDPOINT);
console.log("R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME);
console.log(
  "R2_ACCESS_KEY_ID:",
  process.env.R2_ACCESS_KEY_ID ? "SET" : "NOT SET",
);
console.log(
  "R2_SECRET_ACCESS_KEY:",
  process.env.R2_SECRET_ACCESS_KEY ? "SET" : "NOT SET",
);
console.log("========================");

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
