import cluster from 'node:cluster';
import { config } from './config.js';
import { app } from './app.js';

const useCluster = config.workers > 1;

if (cluster.isPrimary && useCluster) {
  for (let i = 0; i < config.workers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died with code ${code} and signal ${signal}`
    );

    // Fork a new worker
    cluster.fork();
  });
} else {
  console.log(`Worker ${process.pid} started`);

  try {
    const server = await app();

    await server.listen({
      port: config.port,
      host: config.host,
    });

    console.info(`Server listening at http://${config.host}:${config.port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
