import { useCart } from '../../context/useCart';

export default function CartFeedback() {
  const { state, storageWarning } = useCart();
  return (
    <>
      {storageWarning && <p role="alert" className="rounded-lg border border-amber-500 p-3 text-amber-800 dark:text-amber-200">{storageWarning}</p>}
      {state.feedback && (
        <p role={state.feedback.error ? 'alert' : 'status'}
          className={state.feedback.error ? 'text-red-700 dark:text-red-300' : 'text-green-800 dark:text-green-300'}>
          {state.feedback.message}
        </p>
      )}
    </>
  );
}
