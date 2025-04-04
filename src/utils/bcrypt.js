import bcrypt from 'bcrypt';

const saltRounds = 10;

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
};