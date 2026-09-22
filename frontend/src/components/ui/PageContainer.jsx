import { classNames } from "../../utils/classNames";

function PageContainer({ className, children }) {
  return <div className={classNames("mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export default PageContainer;
