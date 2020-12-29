import { InlineMath, BlockMath } from "react-katex";

//PROPS: String text (the question text to display)
function TextDisplay(props) {
  const escapeSequence = "*t&";
  //NOTE there are two types of escapes for a question, [&&linebreak] and *t&

  var str = String(props.text);
  var arr = [];
  var splitAtTex = str.split(escapeSequence);
  for (var i = 0; i < splitAtTex.length; i++) {
    if (i % 2 == 0) {
      var splitAtBr = splitAtTex[i].split("[&&linebreak]");
      splitAtBr.forEach((e) => {
        arr.push(e);
        arr.push(<br></br>);
      });
      arr.pop();
    } else {
      var regex = /\[&&linebreak\]/g;
      var str1 = splitAtTex[i].replace(regex, "");
      arr.push(
        <InlineMath
          renderError={(error) => {
            return <b>Error Loading Equation</b>;
          }}
          errorColor={"#cc0000"}
        >
          {str1}
        </InlineMath>
      );
    }
  }

  return <span className="textDisplay">{arr}</span>;
}

export default TextDisplay;
