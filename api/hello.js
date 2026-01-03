// This is a basic serverless function
export default function handler(req, res) {
  res.status(200).json({
    message: "Hello from your backend! 🚀",
    time: new Date().toISOString(),
    method: req.method
  });
}
