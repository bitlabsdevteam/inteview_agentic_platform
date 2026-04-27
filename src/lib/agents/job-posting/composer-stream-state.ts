export type EmployerJobComposerStreamStatus = "idle" | "streaming" | "error" | "complete";

export type EmployerJobComposerStreamState = {
  status: EmployerJobComposerStreamStatus;
  statusMessage: string;
  thinkingStream: string;
  activeRequestId: number;
};

export type EmployerJobComposerStreamAction =
  | {
      type: "submit_started";
      requestId: number;
    }
  | {
      type: "status_received";
      requestId: number;
      message: string;
    }
  | {
      type: "token_received";
      requestId: number;
      token: string;
    }
  | {
      type: "stream_failed";
      requestId: number;
      message: string;
    }
  | {
      type: "stream_completed";
      requestId: number;
    };

export const INITIAL_EMPLOYER_JOB_COMPOSER_STREAM_STATE: EmployerJobComposerStreamState = {
  status: "idle",
  statusMessage: "Waiting for prompt submission.",
  thinkingStream: "",
  activeRequestId: 0
};

export function reduceEmployerJobComposerStreamState(
  state: EmployerJobComposerStreamState,
  action: EmployerJobComposerStreamAction
): EmployerJobComposerStreamState {
  if (action.type === "submit_started") {
    return {
      status: "streaming",
      statusMessage: "Initializing stream.",
      thinkingStream: "",
      activeRequestId: action.requestId
    };
  }

  if (action.requestId !== state.activeRequestId) {
    return state;
  }

  if (action.type === "status_received") {
    return {
      ...state,
      statusMessage: action.message
    };
  }

  if (action.type === "token_received") {
    return {
      ...state,
      thinkingStream: `${state.thinkingStream}${action.token}`
    };
  }

  if (action.type === "stream_failed") {
    return {
      ...state,
      status: "error",
      statusMessage: action.message
    };
  }

  return {
    ...state,
    status: "complete",
    statusMessage: "Draft generation complete."
  };
}
