type SignOutResult = {
  error: {
    message?: string | null;
  } | null;
};

type LogoutUserOptions = {
  signOut: () => Promise<SignOutResult>;
};

export type LogoutUserResult =
  | {
      status: "success";
      redirectTo: "/";
    }
  | {
      status: "error";
      message: string;
    };

export async function logoutUser({ signOut }: LogoutUserOptions): Promise<LogoutUserResult> {
  const result = await signOut();

  if (result.error) {
    return {
      message: "We could not log you out right now. Try again.",
      status: "error"
    };
  }

  return {
    redirectTo: "/",
    status: "success"
  };
}
