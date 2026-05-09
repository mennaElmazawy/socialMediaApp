
import { Model } from 'mongoose';
import UserModel, { IUser } from '../models/user.model';
import BaseRepository from './base.repositories';



class UserRepository extends BaseRepository<IUser> {
    constructor(protected readonly Model:Model<IUser> = UserModel) {
        super(Model);
    }

}

export default  UserRepository