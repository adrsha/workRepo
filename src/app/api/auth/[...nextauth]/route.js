import NextAuth from "next-auth";
import providers from "./authOptions"; // Ensure you have an `authOptions` file

export const auth = NextAuth(providers);

export { auth as GET, auth as POST };
