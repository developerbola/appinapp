export const command = 'echo "Hello world by exported command"'
const index = ({ run, output }) => {
  run('echo "Hello world"');
  return <div className="bg-red-400 w-screen h-screen">command output: {output}</div>;
};

export default index;


export const windowTop = 500;
export const windowLeft = 500;
export const windowHeight = 500;
export const windowWidth = 500;
