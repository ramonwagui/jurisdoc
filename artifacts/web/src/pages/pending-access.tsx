import { Redirect } from "wouter";

export default function PendingAccess() {
  return <Redirect to="/login" />;
}
