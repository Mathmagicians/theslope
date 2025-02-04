declare module "#auth-utils" {
    interface UserSession {
        // define the type here
        loggedInAt: Date;
    }

    interface User {
        "id": number,
        "email": string,
        "phone": string,
        "passwordHash": string,
        "systemRole": string,
        "createdAt": Date,
        "updatedAt": Date,
        "Inhabitant": {
            "id": number,
            "heynaboId": number,
            "userId": number,
            "householdId": number,
            "pictureUrl": string,
            "name": string,
            "lastName": string,
            "birthDate": Date
        }
    }
}
export {}
