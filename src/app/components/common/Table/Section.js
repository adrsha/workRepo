export const Section = ({ title, children, className = '' }) => (
    <section className={className}>
        {title && <h3 className="headers">{title}</h3>}
        {children}
    </section>
);
