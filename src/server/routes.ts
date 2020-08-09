import { Router } from 'express';
import { FileService } from '../server/services/FileService';
import { VerificationService } from '../server/services/VerificationService'; 
import FileController from './controllers/FileController';
import VerificationController from './controllers/VerificationController';
import * as bunyan from 'bunyan';
import { Logger } from '../utils/logger/Logger';

const router: Router = Router();
const logger: bunyan = Logger("Server");

const fileService = new FileService(logger);
const verificationService = new VerificationService(fileService, logger);

const fileController = new FileController(fileService, logger);
const verificationController = new VerificationController(verificationService, fileService, logger);

router.use('/files', fileController.registerRoutes());
router.use('/', verificationController.registerRoutes());

export default router;
