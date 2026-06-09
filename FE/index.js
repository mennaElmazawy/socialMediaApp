const clientIo = io("http://localhost:3000", {
    auth: {
        authorization: `Bearer ${localStorage.getItem("authorization")}`
    }
})
clientIo.emit("sayHi","hi from fe")
clientIo.on("sayHiBack", (data) => {
    console.log({ data })
   
})

// const clientIoAdmin=io("http://localhost:3000/admin")

// clientIo.emit("hi",{id:localStorage.getItem("socketId")})

clientIo.on("connect_error", (error) => {
    console.log({ error })
   
})

// clientIoAdmin.emit("hi","hi from fe",(data)=>{
//     console.log(data)
// })