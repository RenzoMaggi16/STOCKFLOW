import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useBusiness } from "../contexts/BusinessContext";
import { Page, Status } from "../components/ui";
import Landing from "../screens/Landing";
export default function Welcome() {
  const auth = useAuth();
  const business = useBusiness();
  if (auth.loading || (auth.user?.email_verificado && business.loading))
    return (
      <Page title="StockFlow">
        <Status loading />
      </Page>
    );
  if (auth.user)
    return (
      <Redirect href={auth.user.email_verificado ? business.active ? "/(tabs)" : "/businesses" : "/verify"} />
    );
  return <Landing />;
}
