import { NextFunction, Request, Response, Router } from 'express';
import BaseController from './BaseController';
import { IController } from '../../common/interfaces';
import { IVerificationService } from '../services/VerificationService';
import { InputData, Match } from '../../common/types';
import config from '../../config';
import { IFileService } from '../services/FileService';
import * as bunyan from 'bunyan';
import { Logger } from '../../utils/logger/Logger';
import { NotFoundError } from '../../common/errors';

export default class VerificationController extends BaseController implements IController {
    router: Router;
    verificationService: IVerificationService;
    fileService: IFileService;
    logger: bunyan;

    constructor(verificationService: IVerificationService, fileService: IFileService, logger?: bunyan) {
        super();
        this.router = Router();
        this.verificationService = verificationService;
        this.fileService = fileService;
        this.logger = Logger("VerificationService");
        if(logger !== undefined){
            this.logger = logger;
        }
    }

    verify = async (req: Request, res: Response, next: NextFunction) => {
        const inputData: InputData = {
            files: [],
            addresses: [req.body.address],
            chain: this.fileService.getChainId(req.body.chain)
          }

          await this.verificationService.findByAddress(req.body.address, inputData.chain, config.repository.path);
          if(!req.files) next(new NotFoundError("Input files not found!"));
          inputData.files = await this.verificationService.organizeFilesForSubmision(req.files!!);
          let matches: Promise<Match>[] = [];
          matches = await this.verificationService.verify(inputData);

          const promises: Promise<Match>[] = [];
    }
    
    registerRoutes = (): Router => {
        this.router
        .post([
        ], this.safeHandler(this.verify));
        return this.router;
    }
}
