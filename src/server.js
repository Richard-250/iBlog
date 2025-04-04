// import app from "./app.js";
import 'dotenv/config';
import logger from "./utils/logger.js";
import { server } from "./app.js";

const port = process.env.PORT || 3001;

server.listen(port, () => {
  logger.info('✅ Server started');
  console.log(`Server is listening on port ${port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Error: ${err.message}`);
  // Close server and exit process
  server.close(() => process.exit(1));
});

// export default server