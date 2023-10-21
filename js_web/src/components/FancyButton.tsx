import styles from "./FancyButton.module.css";

export const FancyButton = ({ children, ...props }: any) => (
  <button className={styles.fancy} {...props}>
    {children}
  </button>
);
