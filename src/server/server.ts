import express from 'express';
import serveIndex from 'serve-index';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import Injector from '../injector';
import Logger from 'bunyan';
import path from 'path';
import routes from './routes';
import {
  findInputFiles,
  InputData,
  sanitizeInputFiles,
  findByAddress,
  errorMiddleware,
  Match,
  fetchAllFileContents,
  fetchAllFileUrls,
  FileObject,
  NotFound,
  getChainId
} from "../utils";

import bodyParser from 'body-parser';
import MessageQueue from './services/Queue';
let localChainUrl;

if (process.env.TESTING) {
  localChainUrl = process.env.LOCALCHAIN_URL;
}

const injector = new Injector({
  localChainUrl: localChainUrl,
  log: log,
  infuraPID: process.env.INFURA_ID || "changeinfuraid"
});

export class Server {

  app: express.Application;
  logger: Logger;
  repository = process.env.MOCK_REPOSITORY || './repository';
  port = process.env.SERVER_PORT || 5000;

  constructor() {
    this.logger = Logger.createLogger({
      name: "Server",
      streams: [{
        stream: process.stdout,
        level: 30
      }]
    });
    
    this.app = express();
    
    // TODO: 52MB is the max file size - is this right?
    this.app.use(fileUpload({
      limits: {fileSize: 50 * 1024 * 1024},
      abortOnLimit: true
    }))
    
    this.app.use(cors())
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.get('/health', (req, res) => res.status(200).send('Alive and kicking!'))
    this.app.use('/repository', express.static(this.repository), serveIndex(this.repository, {'icons': true}))
    this.app.use('/', routes);
    this.app.use(errorMiddleware);
    this.app.listen(this.port, () => this.logger.info({loc: '[LISTEN]'}, `Injector listening on port ${this.port}!`))
  }
}

/* tslint:enable:no-unused-variable */
app.post('/', (req, res, next) => {
  const inputData: InputData = {
    repository: repository,
    files: [],
    addresses: [req.body.address],
    chain: getChainId(req.body.chain)
  }

  // Try to find by address, return on success.
  try {
    const result = findByAddress(req.body.address, inputData.chain, repository);
    res.status(200).send({result});
    return;
  } catch(err) {
    const msg = "Could not find file in repository, proceeding to recompilation"
    log.info({loc:'[POST:VERIFICATION_BY_ADDRESS_FAILED]'}, msg);
  }

  // Try to organize files for submission, exit on error.
  try {
    const files = findInputFiles(req, log);
    inputData.files = sanitizeInputFiles(files, log);
  } catch (err) {
    return next(err);
  }

 
})

