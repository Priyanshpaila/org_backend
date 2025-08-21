import jwt from "jsonwebtoken";

export const signTokens = (user) => {
  const access = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
  );
  return { accessToken: access };
};
