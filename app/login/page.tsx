import LoginPage from "@/components/login-form";
import { isAdminCreated } from "@/lib/actions/users";

export default async function page() {
  return <LoginPage />;
}
