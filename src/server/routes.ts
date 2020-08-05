import { Router } from 'express';
import { FileService } from '../server/services/FileService';
import { VerificationService } from '../server/services/VerificationService'; 
import FileController from './controllers/FileController';
import VerificationController from './controllers/VerificationController';

const router: Router = Router();

const fileService = new FileService();
const verificationService = new VerificationService();

const fileController = new FileController(fileService);
const verificationController = new VerificationController(verificationService);

router.use('/files', fileController.registerRoutes());
router.use('/', verificationController.registerRoutes());

export default router;
