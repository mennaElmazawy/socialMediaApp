
import { hashSync, compareSync } from "bcrypt";
import { SALT_ROUNDS } from "../../../config/config.service";



export const Hash= ({plainText,salt_Rounds=SALT_ROUNDS}:{plainText:string,salt_Rounds?:number}):string => {

    return hashSync(plainText.toString(), Number(salt_Rounds))
}

export const Compare= ({plainText, cipherText}:{plainText:string,cipherText:string}):boolean => {

    return compareSync(plainText, cipherText)
}