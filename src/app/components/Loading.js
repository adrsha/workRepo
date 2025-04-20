import './innerStyles/Loading.css';
export default function Nav() {
  return (
    <div className="loadingContainer">
      <div className="book">
        <div className="book__pg-shadow"></div>
        <div className="book__pg"></div>
        <div className="book__pg book__pg--2"></div>
        <div className="book__pg book__pg--3"></div>
        <div className="book__pg book__pg--4"></div>
        <div className="book__pg book__pg--5"></div>
      </div>
      <h1 className="loadingText">Loading...</h1>
    </div>
  );
}
