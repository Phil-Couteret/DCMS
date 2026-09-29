"use client";

import { startTransition, useActionState, type FormEvent } from "react";

// Runs a server action from onSubmit instead of <form action>. React 19
// resets a form after its action completes: uncontrolled fields are cleared
// and selects jump back to their first option while React's state still holds
// the old choice, so a retry after an error can silently submit the wrong
// values. Submitting this way leaves the form exactly as the user left it.
export function useFormAction<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initial: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState<State, FormData>(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The clicked button's name and value are sent too, as with a native submit.
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
  return [state, onSubmit, pending] as const;
}
