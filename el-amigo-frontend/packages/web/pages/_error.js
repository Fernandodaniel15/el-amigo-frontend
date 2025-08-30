// packages/web/pages/_error.js
function Error({ statusCode }) {
  const msg = statusCode
    ? `Error ${statusCode}`
    : 'Se produjo un error en la aplicación';

  return (
    <main style={{padding:'2rem', fontFamily:'sans-serif'}}>
      <h1>{msg}</h1>
      <p>Vuelve a la <a href="/">página principal</a>.</p>
    </main>
  );
}

Error.getInitialProps = ({ res, err }) => ({
  statusCode: res?.statusCode || err?.statusCode || 404
});

export default Error;
