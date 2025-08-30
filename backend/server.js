const app = require("./app");
const { cloudinaryConnect } = require("./config/cloudinary");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

cloudinaryConnect();

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://10.93.73.154:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
