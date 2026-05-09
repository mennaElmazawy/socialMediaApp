import { Response } from "express"


function successResponse<T>({
    res,
    status = 200,
    message = "done",
    data
}: { res: Response, status?: number, message?: string, data?: T }
) {
    return res.status(status).json({ message, data })
}

export default successResponse;