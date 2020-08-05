import { NextFunction, Request, Response, Router } from 'express';
import BaseController from './BaseController';
import { IController } from '../../common/interfaces';
import { IVerificationService } from '../services/VerificationService';
import { InputData, Match } from '../../common/types';
import config from '../../config';
import { getChainId } from '../../common/Utils';

export default class VerificationController extends BaseController implements IController {
    router: Router;
    verificationService: IVerificationService;

    constructor(verificationService: IVerificationService) {
        super();
        this.router = Router();
        this.verificationService = verificationService;        
    }

    verify = async (req: Request, res: Response, next: NextFunction) => {
        const inputData: InputData = {
            files: [],
            addresses: [req.body.address],
            chain: getChainId(req.body.chain)
          }

          await this.findByAddress(req.body.address, inputData.chain, config.repository.path);
          await this.organizeFilesForSubmision();

          const promises: Promise<Match>[] = [];
          await this.inject(inputData);

          // Injection
          promises.push(injector.inject(inputData));
        
          // This is so we can have multiple parallel injections, logic still has to be completely implemented
          Promise.all(promises).then((result) => {
            res.status(200).send({result});
          }).catch(err => {
            next(err); // Just forward it to error middelware
          })
    }

    findByAddress = async (address: string, chain: string, repository: string) => {
        // Try to find by address, return on success.
        try {
            const result = findByAddress(address, chain, repository);
            res.status(200).send({result});
            return;
        } catch(err) {
            const msg = "Could not find file in repository, proceeding to recompilation"
            log.info({loc:'[POST:VERIFICATION_BY_ADDRESS_FAILED]'}, msg);
        }
    }

    organizeFilesForSubmision = async (){
        // Try to organize files for submission, exit on error.
        try {
            const files = findInputFiles(req, log);
            inputData.files = sanitizeInputFiles(files, log);
        } catch (err) {
            return next(err);
        }
    }

    inject = async () {
        // Injection
        const promises: Promise<Match>[] = [];
        promises.push(injector.inject(inputData));

        // This is so we can have multiple parallel injections, logic still has to be completely implemented
        Promise.all(promises).then((result) => {
            res.status(200).send({result});
        }).catch(err => {
            next(err); // Just forward it to error middelware
        })
    }

    registerRoutes = (): Router => {
        this.router
        .post([
        ], this.safeHandler(this.verify));
        return this.router;
    }
}
