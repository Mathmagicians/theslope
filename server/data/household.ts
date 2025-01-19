export class Household {
    constructor(
        public heynaboid: string,
        public address: string,
        public pbs: string,
        public fromDate: string,
        public members: Inhabitant[]) {
    }
}

export class Inhabitant {
    constructor(
        public heynaboid: string,
        public householdId: string,
        public name: string,
        public lastName: string,
        public birthdate: string,
        public email: string,
        public phone: string,
        public allergies: string[],
    ) {
    }
}

export enum Role {
    chef = "CHEF",
    cook = "COOK",
    kid = "JUNIORHELPER",
    admin = "ADMIN",
}

export class User {
    constructor(
        public id: string,
        public email: string,
        public password: string,
        public roles: Role[],
    ) {
    }
}
