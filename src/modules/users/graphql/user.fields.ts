import {  authorization_gql } from './../../../common/middleware/authorization';
import { GraphQLList } from 'graphql';
import {  UserType } from './user.type';
import {  getUserArgs } from './user.args';
import userServices from '../user.services';
import { authentication_gql } from '../../../common/middleware/authentication';
import { Validation_GQL } from '../../../common/middleware/validation';
import { getUserSchema } from '../user.validation';



export class UserFields {
    constructor() { }

    query = () => {
        return {
            getUser: {
                type: UserType,
                args: getUserArgs,

                resolve: async (parent: any, args: any, context: any) => {
                    await Validation_GQL(getUserSchema, args)
                    const { user, decoded } = await authentication_gql(args.token)
                    await authorization_gql(["admin"], user?.role!)
                    return userServices.getUser(user._id)
                }
            },
            listUsers: {
                type: new GraphQLList(UserType),
                resolve: async (parent: any, args: any, context: any) => {

                    return userServices.getUsers()
                }
            }
        }
    }
    // mutation = () => {
    //     // return {
    //     //     createUser: {
    //     //         type: new GraphQLList(UserType),
    //     //         args: createUserArgs,
    //     //         resolve: (parent: any, args: any) => {
    //     //             const { id, name, age, gender } = args
    //     //             const userExist = users.find(user => user.id == id)
    //     //             if (userExist) {
    //     //                 throw new AppError("user already exist")
    //     //             }
    //     //             users.push({ id, name, age, gender })
    //     //             return users
    //     //         }
    //     //     }
    //     // }
    // }
}



export default new UserFields()