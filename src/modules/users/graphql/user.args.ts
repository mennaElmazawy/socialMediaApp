import { GraphQLID, GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
import { GenderType } from "./user.type";


export const getUserArgs = {
    //  _id: { type: new GraphQLNonNull(GraphQLID) },
    token:{type:new GraphQLNonNull(GraphQLString)}

}
export const createUserArgs = {
    id: { type: new GraphQLNonNull(GraphQLInt) },
    age: { type: new GraphQLNonNull(GraphQLInt) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    gender: { type: new GraphQLNonNull(GenderType) },

}