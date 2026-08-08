import { RouteDialog } from "@/components/route-dialog";
import {
  SignInContent,
  type SignInSearchParams,
} from "@/components/sign-in-content";

export default function SignInModal({
  searchParams,
}: {
  searchParams: SignInSearchParams;
}) {
  return (
    <RouteDialog ariaLabelledBy="sign-in-title">
      <SignInContent searchParams={searchParams} />
    </RouteDialog>
  );
}
