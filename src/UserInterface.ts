import { Application} from 'pixi.js';
import { Display } from './Display';
import { Vector } from './Vector';

export class UserInterface{
    private static instance: UserInterface;
    private app: Application;
    private display: Display;
    private mousePosition: Vector;
    private mouseDown: boolean;
    private mouseDragStart: Vector;

    private fluidFieldToggleElement: HTMLButtonElement;
    private vectorFieldToggleElement: HTMLButtonElement;

    private fieldXInputElement: HTMLInputElement;
    private fieldYInputElement: HTMLInputElement;

    constructor(_app: Application){
        this.app = _app;
        this.display = Display.Instance;
        this.mousePosition = new Vector(0,0);
        this.mouseDown = false;
        this.mouseDragStart = new Vector(0,0);

        this.fluidFieldToggleElement = document.getElementById('plotFluidFieldButton') as HTMLButtonElement;
        this.vectorFieldToggleElement = document.getElementById('plotVectorFieldButton') as HTMLButtonElement;
        this.vectorFieldToggleElement.style.backgroundColor = "green";
        this.fluidFieldToggleElement.style.backgroundColor = "green";


        this.fieldXInputElement = document.getElementById('fieldXInputElement') as HTMLInputElement;
        this.fieldYInputElement = document.getElementById('fieldYInputElement') as HTMLInputElement;

        
        this.vectorFieldToggleElement.addEventListener("click", ()=>{
            if(this.display.isPlotVectorField){
                this.display.isPlotVectorField = false;
                this.vectorFieldToggleElement.style.backgroundColor = "white";
            }else{
                this.display.isPlotVectorField = true;
                this.vectorFieldToggleElement.style.backgroundColor = "green";
            }
        })

        this.fluidFieldToggleElement.addEventListener("click", ()=>{
            if(this.display.isPlotFluidField){
                this.display.isPlotFluidField = false;
                this.fluidFieldToggleElement.style.backgroundColor = "white";
            }else{
                this.display.isPlotFluidField = true;
                this.fluidFieldToggleElement.style.backgroundColor = "green";
            }
        })

        this.fieldXInputElement.addEventListener("input", ()=>{
            this.display.fieldXInput = this.fieldXInputElement.value
        })

        this.fieldYInputElement.addEventListener("input", ()=>{
            this.display.fieldYInput = this.fieldYInputElement.value
        })

        document.body.addEventListener('keypress', (event) => {
            if(event.key == "."){
                this.display.unitIntervals *= 2;
            }
            if(event.key == ","){
                this.display.unitIntervals /= 2;
            }
            if(event.key == "p"){
                this.display.precisionDP += 1;
            }
            if(event.key == "o"){
                this.display.precisionDP -= 1;
            }
        });

        this.app.canvas.addEventListener('wheel', (event) => {
            if(event.deltaY>0){
                this.display.unitToPixel /= 2;
                this.display.unitIntervals *= 2;
                let cursorAnchorPosition = Vector.VectorScale(Vector.Sub(this.mousePosition, this.display.halfScreen),new Vector(1,-1));
                this.display.TranslateOrigin(Vector.Scale(Vector.Sub(cursorAnchorPosition, this.display.originTranslationVector),0.5));
            }if(event.deltaY<0){
                this.display.unitToPixel *= 2;
                this.display.unitIntervals /= 2;
                let cursorAnchorPosition = Vector.VectorScale(Vector.Sub(this.mousePosition, this.display.halfScreen),new Vector(1,-1));
                this.display.TranslateOrigin(Vector.Sub(this.display.originTranslationVector, cursorAnchorPosition));
            }
        });

        this.app.canvas.addEventListener('mousemove', (event) => {
            this.mousePosition = new Vector(event.x-this.app.canvas.getBoundingClientRect().left, event.y-this.app.canvas.getBoundingClientRect().top);
            if(this.mouseDown){
                this.display.TranslateOrigin(Vector.VectorScale(Vector.Sub(this.mousePosition, this.mouseDragStart),new Vector(1,-1)));
                this.mouseDragStart = this.mousePosition;
            }
        });

        this.app.canvas.addEventListener('mousedown', () => {
            this.mouseDown = true;
            this.mouseDragStart = this.mousePosition;
        });

        
        document.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

    }

    static Initialize(_app: Application){
        this.instance = new UserInterface(_app);
    }

    static get Instance(){
        return this.instance;
    }

    // InputToExpression(input: string){
    //     return this.SymbolicBracketCorrector(this.SymbolicEvaluator(input.replace(/\s/g, '').split(''))).join('');
    // }

    InputToValue(input: string, values:string[]){
        return Number(this.NumericalEvaluator(input.replace(/\s/g, '').split(''), values).join(''));
    }
    
    NumericalEvaluator(mainExpressionArray: string[], values: string[]){
        let previousExpressionArray: string[] = [];
        while(mainExpressionArray.includes('(')){
            if(previousExpressionArray.join('') == mainExpressionArray.join('')){
                console.log("ERROR")
                return ["ERROR"];
            }
            previousExpressionArray = mainExpressionArray
            mainExpressionArray = this.NumericalBracketEvaluater(mainExpressionArray, values);      
        }
        mainExpressionArray = this.NumericalMulDivChecker(mainExpressionArray, values)
        mainExpressionArray = this.NumericalAddSubChecker(mainExpressionArray, values)
        if(!this.IsNumber(mainExpressionArray.join(''))){
            mainExpressionArray = this.NumericalSymbolEvaluator(mainExpressionArray, values) //In the case of a single y var without any operators
        }
        return mainExpressionArray;
    }

    NumericalBracketEvaluater(mainExpressionArray: string[], values: string[]){
        let firstI = 0;
        let endI = 0;
        let additionalBracketCount = 0;
        firstI = mainExpressionArray.indexOf('(');
        for (let i = firstI+1; i < mainExpressionArray.length; i++) {
            if(mainExpressionArray[i] == '('){
                additionalBracketCount++;
            }
            if(mainExpressionArray[i] == ')'){
                if(additionalBracketCount == 0){
                    endI = i;
                    break;
                }
                else{
                    additionalBracketCount--;
                }
            }
        }
        let bracketExpressionArray: string[] = mainExpressionArray.slice(firstI+1,endI) //Expression Inside the brackets
        bracketExpressionArray = this.NumericalEvaluator(bracketExpressionArray, values) //Expression is passed as if input
        //Return final numerical value of expression
        mainExpressionArray = this.NumberReplace(mainExpressionArray, firstI, endI, Number(bracketExpressionArray.join('')))
        return mainExpressionArray
    }
    
    NumericalOperatorEvaluator(mainExpressionArray: string[], rootI: number, operator:string, values: string[]){
        let operatorArray = ['+','-','*','/'];
        let signArray = ['+','-'];
        let startIndex1 = 0;
        let array1: string[] = []
        let string1 = "";
        let final1 = 0;
        //values is an array with even i --> 'x' and the subsequent i --> '10' (value of x)
    
        if(rootI == mainExpressionArray.length-1){
            return ["ERROR"];
        }
    
        for (let i = rootI-1; i >= 0 ; i--) {
            if(!operatorArray.includes(mainExpressionArray[i]) || (i == rootI-1 && signArray.includes(mainExpressionArray[i])) || (i == 0 && signArray.includes(mainExpressionArray[i]))){
                array1.unshift(mainExpressionArray[i]);
                startIndex1 = i
            }
            else{
                break;
            }
        }
        string1 = array1.join('');
        if(values.includes(string1) && (values.indexOf(string1)%2 == 0)){
            final1 = Number(values[values.indexOf(string1)+1])
        }
        if(string1[0] == "-" && values.includes(string1.substring(1)) && (values.indexOf(string1.substring(1))%2 == 0)){ //NEED TO CHECK IF THIS WORKS
            final1 = -1*Number(values[values.indexOf(string1.substring(1))+1])
        }
        else if (this.IsNumber(string1)){
            final1 = Number(string1)
        }
    
        let array2: string[] = []
        let  endIndex2 = 0;
        let string2 = '';
        let final2 = 0;
        for (let i = rootI+1; i < mainExpressionArray.length ; i++) {
            if(!operatorArray.includes(mainExpressionArray[i]) || (i == rootI+1 && signArray.includes(mainExpressionArray[i]))){
                array2.push(mainExpressionArray[i])
                endIndex2 = i
            }
            else{
                break;
            }
        }
        string2 = array2.join('');
        if(values.includes(string2) && (values.indexOf(string2)%2 == 0)){
            final2 = Number(values[values.indexOf(string2)+1])
        }
        if(string2[0] == "-" && values.includes(string2.substring(1)) && (values.indexOf(string2.substring(1))%2 == 0)){ //NEED TO CHECK IF THIS WORKS
            final2 = -1*Number(values[values.indexOf(string2.substring(1))+1])
        }
        else if (this.IsNumber(string2)){
            final2 = Number(string2)
        }
    
        let resultArray: string[] = []
        if(operator == "+"){
            resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, final1+final2)
        }
        if(operator == "-"){
            resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, final1-final2)
        }
        if(operator == "*"){
            resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, final1*final2)
        }
        if(operator == "/"){
            if(final2 == 0){
                return ["ERROR"]
            }
            resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, final1/final2)
        }
        return resultArray;
    }

    NumericalMulDivChecker(mainExpressionArray: string[], values: string[]){
        let resultArray: string[] = mainExpressionArray;
        let previousExpressionArray: string[] = []
        while(resultArray.includes('*') || resultArray.includes('/')){
            if(previousExpressionArray.join('') == resultArray.join('')){
                console.log("ERROR")
                return ["ERROR"];
            }
            previousExpressionArray = resultArray;
            if(resultArray.includes('*') && resultArray.includes('/')){
                if(resultArray.indexOf('*')<resultArray.indexOf('/')){
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.indexOf('*'), '*', values)
                }else{
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.indexOf('/'), '/', values)
                }
            }else{
                if(resultArray.includes('*')){
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.indexOf('*'), '*', values)
                }else{
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.indexOf('/'), '/', values)
                }
            }
        }
        return resultArray;
    }
    
    NumericalAddSubChecker(mainExpressionArray: string[], values: string[]){
        let resultArray: string[] = mainExpressionArray;
        let previousExpressionArray: string[] = []
        while(resultArray.includes('+') || resultArray.slice(1,resultArray.length).includes('-')){
            if(previousExpressionArray.join('') == resultArray.join('')){
                console.log("ERROR")
                return ["ERROR"];
            }
            previousExpressionArray = resultArray;
    
            if(resultArray.includes('+') && resultArray.slice(1,resultArray.length).includes('-')){
                if(resultArray.indexOf('+')<resultArray.slice(1,resultArray.length).indexOf('-')+1){
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.indexOf('+'), '+', values)
                }else{
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.slice(1,resultArray.length).indexOf('-')+1, '-', values)
                }
            }else{
                if(resultArray.includes('+')){
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.indexOf('+'), '+', values)
                }else{
                    resultArray = this.NumericalOperatorEvaluator(resultArray, resultArray.slice(1,resultArray.length).indexOf('-')+1, '-', values)
                }
            }
        }
        return resultArray;
    }

    NumericalSymbolEvaluator(mainExpressionArray: string[], values:string[]){
        let symbol = mainExpressionArray.join('');
        let symbolValue = 0
        if(values.includes(symbol) && (values.indexOf(symbol)%2 == 0)){
            symbolValue = Number(values[values.indexOf(symbol)+1])
        }
        else if(symbol[0] == "-" && values.includes(symbol.substring(1)) && (values.indexOf(symbol.substring(1))%2 == 0)){ //NEED TO CHECK IF THIS WORKS
            symbolValue = -1*Number(values[values.indexOf(symbol)+1])
        }else{
            symbolValue = 0
        }
        return String(symbolValue).split('');
    }
    
    
    NumberReplace = (array: string[], startIndex1:number, endIndex2:number, finalNumber:number)=>{
        let returnArray: string[] = []
        if (startIndex1 == 0) {
            returnArray = returnArray.concat(finalNumber.toString().split(''));
        }else{
            returnArray = returnArray.concat(array.slice(0,startIndex1)).concat(finalNumber.toString().split(''));
        }
        if(endIndex2 == array.length-1){
            return returnArray;
        }else{
            returnArray = returnArray.concat(array.slice(endIndex2+1,array.length))
            return returnArray;
        }
    }

    IsNumber(string: string): boolean{
        if(!isNaN(Number(string)) && isFinite(Number(string))){
            return true;
        }else{
            return false;
        }
    }

    // UNABLE TO COMPLETE THE SYMBOLIC SIMPLIFIER TO REDUCE BRACKETS AND REDUCE TIME FOR EACH EVALUATION

    // SymbolicEvaluator(mainExpressionArray: string[]){
    //     let previousExpressionArray: string[] = [];
    //     while(mainExpressionArray.includes('(')){
    //         if(previousExpressionArray.join('') == mainExpressionArray.join('')){
    //             console.log("ERROR")
    //             return ["ERROR"];
    //         }
    //         previousExpressionArray = mainExpressionArray
    //         mainExpressionArray = this.SymbolicBracketEvaluater(mainExpressionArray);      
    //     }
    //     mainExpressionArray = this.SymbolicMulDivChecker(mainExpressionArray)
    //     console.log(mainExpressionArray)
    //     mainExpressionArray = this.SymbolicAddSubChecker(mainExpressionArray)

    //     for (let i = 0; i < mainExpressionArray.length; i++) {
    //         if(mainExpressionArray[i] == '#'){
    //             mainExpressionArray[i] = '+'
    //         }            
    //         else if(mainExpressionArray[i] == '_'){
    //             mainExpressionArray[i] = '-'
    //         }            
    //         else if(mainExpressionArray[i] == '`'){
    //             mainExpressionArray[i] = '*'
    //         }            
    //         else if(mainExpressionArray[i] == '|'){
    //             mainExpressionArray[i] = '/'
    //         }
    //     }
    //     return mainExpressionArray;
    // }

    // SymbolicBracketCorrector(mainExpressionArray: string[]){
    //     for (let i = 0; i < mainExpressionArray.length; i++) {
    //         if(mainExpressionArray[i] == '{'){
    //             mainExpressionArray[i] = '('
    //         }
    //         else if(mainExpressionArray[i] == '}'){
    //             mainExpressionArray[i] = ')'
    //         }else if(mainExpressionArray[i] == '<'){
    //             mainExpressionArray.splice(i,1);
    //             i--;
    //         }
    //         else if(mainExpressionArray[i] == '>'){
    //             mainExpressionArray.splice(i,1);
    //             i--;
    //         }
    //     }
    //     return mainExpressionArray;
    // }

    // SymbolicBracketEvaluater(mainExpressionArray: string[]){
    //     let firstI = 0;
    //     let endI = 0;
    //     let additionalBracketCount = 0;
    //     firstI = mainExpressionArray.indexOf('(');
    //     for (let i = firstI+1; i < mainExpressionArray.length; i++) {
    //         if(mainExpressionArray[i] == '('){
    //             additionalBracketCount++;
    //         }
    //         if(mainExpressionArray[i] == ')'){
    //             if(additionalBracketCount == 0){
    //                 endI = i;
    //                 break;
    //             }
    //             else{
    //                 additionalBracketCount--;
    //             }
    //         }
    //     }
    //     let bracketExpressionArray: string[] = mainExpressionArray.slice(firstI+1,endI) //Expression Inside the brackets
    //     bracketExpressionArray = this.SymbolicEvaluator(bracketExpressionArray);
    //     if(this.IsNumber(bracketExpressionArray.join(''))){
    //         // console.log(this.NumberReplace(mainExpressionArray, firstI, endI, Number(bracketExpressionArray.join(''))))
    //         return this.SymbolicReplace(mainExpressionArray, firstI, endI, '<' + bracketExpressionArray.join('') + '>')
    //     }else{
    //         let expression = this.SymbolicReplace(mainExpressionArray,firstI,endI, '{' + bracketExpressionArray.join('') + '}')
    //         if(mainExpressionArray[firstI-1] != "/" && mainExpressionArray[firstI-1] != "*" && mainExpressionArray[endI+1] != "/" && mainExpressionArray[endI+1] != "*" ){
    //             expression = this.SymbolicCommutator(expression)
    //         }
    //         return expression
    //     }
    // }
    // //A First round simplifier to change all multiple -- --> +, --- --> - TODO

    // SymbolicCommutator(mainExpressionArray: string[]){
    //     let firstI = 0;
    //     let endI = 0;
    //     let additionalBracketCount = 0;
    //     firstI = mainExpressionArray.indexOf('{');
    //     let insideBracket = false;
    //     for (let i = firstI+1; i < mainExpressionArray.length; i++) {
    //         if(mainExpressionArray[i] == '{'){
    //             additionalBracketCount++;
    //         }
    //         if(mainExpressionArray[i] == '}'){
    //             if(additionalBracketCount == 0){
    //                 endI = i;
    //                 break;
    //             }
    //             else{
    //                 additionalBracketCount--;
    //             }
    //         }

    //         if(insideBracket){
    //             if(mainExpressionArray[i] == '+'){
    //                 mainExpressionArray[i] = '#'
    //             }            
    //             else if(mainExpressionArray[i] == '-'){
    //                 mainExpressionArray[i] = '_'
    //             }   
    //         }
            
    //         if(mainExpressionArray[i] == '{'){
    //             insideBracket = true;
    //         }else if(mainExpressionArray[i] == '}'){
    //             insideBracket = false;
    //         }
    //     }
    //     //It has to go from inside brackets to outside brackets. So must recurr untill it reaches the bottom bracket //TODO
    //     let bracketExpressionArray = mainExpressionArray.slice(firstI+1,endI)
    //     if(firstI == 0){
    //         if(bracketExpressionArray[0] != '-' && bracketExpressionArray[0]!= '+'){
    //             bracketExpressionArray.unshift('+')
    //         }
    //         mainExpressionArray = this.SymbolicReplace(mainExpressionArray,firstI,endI,bracketExpressionArray.join(''))
    //     }
    //     else if(mainExpressionArray[firstI-1] == '+'){
    //         if(bracketExpressionArray[0] != '-' && bracketExpressionArray[0]!= '+'){
    //             bracketExpressionArray.unshift('+')
    //         }
    //         mainExpressionArray = this.SymbolicReplace(mainExpressionArray,firstI,endI,bracketExpressionArray.join(''))
    //         mainExpressionArray.splice(firstI-1,1)
    //     }
    //     else if(mainExpressionArray[firstI-1] == '-'){
    //         if(bracketExpressionArray[0] != '-' && bracketExpressionArray[0]!= '+'){
    //             bracketExpressionArray.unshift('+')
    //         }
    //         for (let i = 0; i < bracketExpressionArray.length; i++) {
    //             if(bracketExpressionArray[i] == '+'){
    //                 bracketExpressionArray[i] = '-'
    //             }else if (bracketExpressionArray[i] == '-'){
    //                 bracketExpressionArray[i] = "+"
    //             }
    //         }
    //         mainExpressionArray = this.SymbolicReplace(mainExpressionArray,firstI,endI,bracketExpressionArray.join(''))
    //         mainExpressionArray.splice(firstI-1,1)
    //     }
    //     return mainExpressionArray;
    //     //NEED TO DO THE COMMUTATOR PROPERLY
    // }
    
    // SymbolicOperatorEvaluator(mainExpressionArray: string[], rootI: number, operator:string){
    //     let operatorArray = ['+','-','*','/','#','_','`','|'];
    //     let insideBracket1 = 0; // More than Zero means inside bracket, Look at implementation to understand
    //     let insideBracket2 = 0; // More than Zero means inside bracket, Look at implementation to understand
    //     let signArray = ['+','-'];
    //     let startIndex1 = 0;
    //     let array1: string[] = []
    //     let string1 = "";
    //     let isNumber1 = false;
    
    //     if(rootI == mainExpressionArray.length-1){
    //         return ["ERROR"];
    //     }
    
    //     for (let i = rootI-1; i >= 0 ; i--) {
    //         if(mainExpressionArray[i] == '>'){
    //             insideBracket1++;
    //         }else if(mainExpressionArray[i] == '<'){
    //             insideBracket1--;
    //         }
    //         if(!operatorArray.includes(mainExpressionArray[i]) || (i == rootI-1 && signArray.includes(mainExpressionArray[i])) || (i == 0 && signArray.includes(mainExpressionArray[i])) || insideBracket1>0){
    //             array1.unshift(mainExpressionArray[i]);
    //             startIndex1 = i
    //         }
    //         else{
    //             break;
    //         }
    //     }
    //     string1 = array1.join('');
    //     if (!isNaN(Number(string1)) && isFinite(Number(string1))){
    //         isNumber1 = true;
    //     }
    
    //     let array2: string[] = []
    //     let  endIndex2 = 0;
    //     let string2 = '';
    //     let isNumber2 = false;
    //     for (let i = rootI+1; i < mainExpressionArray.length ; i++) {
    //         if(mainExpressionArray[i] == '<'){
    //             insideBracket1++;
    //         }else if(mainExpressionArray[i] == '>'){
    //             insideBracket1--;
    //         }
    //         if(!operatorArray.includes(mainExpressionArray[i]) || (i == rootI+1 && signArray.includes(mainExpressionArray[i])) || insideBracket2>0){
    //             array2.push(mainExpressionArray[i])
    //             endIndex2 = i
    //         }
    //         else{
    //             break;
    //         }
    //     }
    //     string2 = array2.join('');
    //     if (!isNaN(Number(string2)) && isFinite(Number(string2))){
    //         isNumber2 = true;
    //     }
    
    //     let resultArray: string[] = []
    //     if(isNumber1 == true && isNumber2 == true){
    //         if(operator == "+"){
    //             resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, Number(string1)+Number(string2))
    //         }
    //         if(operator == "-"){
    //             resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, Number(string1)-Number(string2))
    //         }
    //         if(operator == "*"){
    //             resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, Number(string1)*Number(string2))
    //         }
    //         if(operator == "/"){
    //             if(Number(string2) == 0){
    //                 return ["ERROR"]
    //             }
    //             resultArray = this.NumberReplace(mainExpressionArray,startIndex1,endIndex2, Number(string1)/Number(string2))
    //         }
    //     }else{
    //         if(operator == "+"){
    //             resultArray = this.SymbolicReplace(mainExpressionArray,startIndex1,endIndex2, string1 + '#' + string2)
    //         }
    //         if(operator == "-"){
    //             resultArray = this.SymbolicReplace(mainExpressionArray,startIndex1,endIndex2, string1 + '_' + string2)
    //         }
    //         if(operator == "*"){
    //             resultArray = this.SymbolicReplace(mainExpressionArray,startIndex1,endIndex2, '<' + string1 + '`' + string2 + '>')
    //         }
    //         if(operator == "/"){
    //             resultArray = this.SymbolicReplace(mainExpressionArray,startIndex1,endIndex2, '<' + string1 + '|' + string2 + '>')
    //         }
    //     }
    //     return resultArray;
    // }

    // SymbolicMulDivChecker(mainExpressionArray: string[]){
    //     let resultArray: string[] = mainExpressionArray;
    //     let previousExpressionArray: string[] = []
    //     while(resultArray.includes('*') || resultArray.includes('/')){
    //         if(previousExpressionArray.join('') == resultArray.join('')){
    //             console.log("ERROR")
    //             return ["ERROR"];
    //         }
    //         previousExpressionArray = resultArray;
    //         if(resultArray.includes('*') && resultArray.includes('/')){
    //             if(resultArray.indexOf('*')<resultArray.indexOf('/')){
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.indexOf('*'), '*')
    //             }else{
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.indexOf('/'), '/')
    //             }
    //         }else{
    //             if(resultArray.includes('*')){
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.indexOf('*'), '*')
    //             }else{
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.indexOf('/'), '/')
    //             }
    //         }
    //     }
    //     return resultArray;
    // }
    
    // SymbolicAddSubChecker(mainExpressionArray: string[]){
    //     let resultArray: string[] = mainExpressionArray;
    //     let previousExpressionArray: string[] = []
    //     while(resultArray.includes('+') || resultArray.slice(1,resultArray.length).includes('-')){
    //         if(previousExpressionArray.join('') == resultArray.join('')){
    //             console.log("ERROR")
    //             return ["ERROR"];
    //         }
    //         previousExpressionArray = resultArray;
    
    //         if(resultArray.includes('+') && resultArray.slice(1,resultArray.length).includes('-')){
    //             if(resultArray.indexOf('+')<resultArray.slice(1,resultArray.length).indexOf('-')+1){
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.indexOf('+'), '+')
    //             }else{
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.slice(1,resultArray.length).indexOf('-')+1, '-')
    //             }
    //         }else{
    //             if(resultArray.includes('+')){
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.indexOf('+'), '+')
    //             }else{
    //                 resultArray = this.SymbolicOperatorEvaluator(resultArray, resultArray.slice(1,resultArray.length).indexOf('-')+1, '-')
    //             }
    //         }
    //     }
    //     return resultArray;
    // }

    // SymbolicReplace = (array: string[], startIndex1:number, endIndex2:number, finalExpression: string)=>{
    //     let returnArray: string[] = []
    //     if (startIndex1 == 0) {
    //         returnArray = returnArray.concat(finalExpression.split(''));
    //     }else{
    //         returnArray = returnArray.concat(array.slice(0,startIndex1)).concat(finalExpression.split(''));
    //     }
    //     if(endIndex2 == array.length-1){
    //         return returnArray;
    //     }else{
    //         returnArray = returnArray.concat(array.slice(endIndex2+1,array.length))
    //         return returnArray;
    //     }
    // }
    
}


console.log("USERINTERFACE ACTIVATED")