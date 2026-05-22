 import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLInt, GraphQLBoolean, GraphQLList, GraphQLEnumType } from 'graphql';
import { AppError } from '../../common/utils/responses/global_error_handler';
import  UserFields  from '../users/graphql/user.fields';

 
 
 

    export const gql_schema = new GraphQLSchema({
        query: new GraphQLObjectType({
            name: "query",
            description: "query info",
            fields: {
               ...UserFields.query()

            }
        }),
        // mutation: new GraphQLObjectType({
        //     name:"mutation",
        //     fields:{
        //         // ...UserFields.mutation()
        //     }
        // })
    })