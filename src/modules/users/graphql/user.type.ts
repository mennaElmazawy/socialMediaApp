import { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLEnumType, GraphQLID } from 'graphql';


export let GenderType = new GraphQLEnumType({
    name: "genderType",
    values: {
        male: { value: "male" },
        female: { value: "female" }
    }
})
export let UserType = new GraphQLObjectType({
    name: "getUser",
    fields: {
        _id: { type: GraphQLID },
        age: { type: GraphQLInt },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        email: { type: GraphQLString },
        phone: { type: GraphQLString },
        profilePic: { type: GraphQLString },
        gender: { type: GenderType },
    }
})