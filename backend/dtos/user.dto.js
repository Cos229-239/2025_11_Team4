class UserDTO {
    constructor(user) {
        this.id = user.id;
        this.name = user.name;
        this.email = user.email;
        this.phone = user.phone;
        this.role = user.role;
        // this.on_duty = user.on_duty; // If applicable

        // Explicitly exclude sensitive fields:
        // password, password_hash, verification_token, reset_token, etc.
    }
}

module.exports = UserDTO;
