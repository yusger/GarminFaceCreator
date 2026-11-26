// GarminFaceCreator fixed word-time adapter words-1. Locale phrases copyright (c) 2019 Samuel Rinnetmäki, MIT; see AboutTime notices.
// Creator adapter code GPL-3.0-or-later; original locale MIT terms retained.
import Toybox.Lang;
class GfcWordTime {
 static function lines(hour,minute,second,language){
  var bucket=((minute*60+second+150)/300).toNumber();if(bucket==12){hour=(hour+1)%24;bucket=0;}
  var hours=language.equals("zh")?["午夜","一点","两点","三点","四点","五点","六点","七点","八点","九点","十点","十一点","中午","一点","两点","三点","四点","五点","六点","七点","八点","九点","十点","十一点"]:["twelve","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","one","two","three","four","five","six","seven","eight","nine","ten","eleven"];
  var frames=language.equals("zh")?[["","$1$",""],["$1$","刚过了","不久"],["$1$","过了","十分"],["$1$","过了","十五分"],["$1$","过了","二十分"],["快要","$1$","三十分了"],["","$1$","三十分"],["$1$","三十分","刚过了 不久"],["再二十分","就","$2$了"],["再十五分","就","$2$了"],["再十分","就","$2$了"],["","快要","$2$了"]]:[["","$1$","o'clock"],["little","past","$1$"],["ten","past","$1$"],["quarter","past","$1$"],["twenty","past","$1$"],["almost","$1$","thirty"],["half","past","$1$"],["a bit past","$1$","thirty"],["twenty","to","$2$"],["quarter","to","$2$"],["ten","to","$2$"],["almost","$2$","o'clock"]];
  var values=[hours[hour%24],hours[(hour+1)%24]];var row=frames[bucket];
  return [Lang.format(row[0],values),Lang.format(row[1],values),Lang.format(row[2],values)];
 }
}