import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, KeyboardAvoidingView, ToastAndroid, Alert } from 'react-native';
import * as Permissions from 'expo-permissions';
import {BarCodeScanner} from 'expo-barcode-scanner';
import { TextInput } from 'react-native-paper';
import db from '../config'
import * as firebase from 'firebase'

export default class TransactionScreen extends React.Component {

    constructor(){
      super();
      this.state={
        hasCameraPermissions:null,
        scanned:false,
        scannedBookId:'',
        scannedStudentId:'',
        buttonState:'normal',
        transactionMessage: ""
      }
    }

    getCameraPermissions = async(id) =>{
      const {status} =await Permissions.askAsync(Permissions.CAMERA)

      this.setState({
        hasCameraPermissions: status === 'granted',
        buttonState: id,
        scanned: false
      })
    }

    handleBarCodeScanned = async({type,data})=>{
      const {buttonState} = this.state
      if(buttonState === "BookId"){
        this.setState({
          scanned:true,
          scannedBookId:data,
          buttonState: 'normal'
        })
      }else if(buttonState === "StudentId"){
        this.setState({
          scanned:true,
          scannedStudentId:data,
          buttonState: 'normal'
        })
      }
      
    }

    bookEligiblity = async() => {
      var transactionType = ""
      const bookref = await db.collection("Books").where("bookID","==", this.state.scannedBookId).get()
      if(bookref.docs.length === 0) {
        transactionType = false;
      } else {
        bookref.docs.map((doc)=> {
          var book = doc.data()
          console.log(book)
          if(book.bookAvailabilty) {
            transactionType = "issue"
          } else {
            transactionType = "return"
          }
        })
      }
      return transactionType
    }

    studentEligiblityIssue = async() => {
      var studentElig = ""
      console.log(this.state.scannedStudentId)
      const studentref = await db.collection("Students").where("studentID","==", this.state.scannedStudentId).get()
      console.log(studentref)
      if(studentref.docs.length == 0) {
        studentElig = false;
        Alert.alert("This Student ID does not exist in the database")
        this.setState({
          scannedStudentId: "",
          scannedBookId: "",
        })
      } else {
        studentref.docs.map((doc) =>{
          var student = doc.data()
          if(student.booksIssued < 2) {
            studentElig = true;
          } else {
            studentElig = false;
            Alert.alert("This student already has 2 books issued")
            this.setState({
              scannedStudentId: "",
              scannedBookId: "",
            })
          }
        })
      }
      return studentElig
    }

    studentEligiblityReturn = async() => {
      var studentElig = ""
      const transactionref = await db.collection("Transactions").where("bookId","==", this.state.scannedBookId).limit(1).get()
      console.log(transactionref)
      transactionref.docs.map((doc)=>{
        var lastTransaction = doc.data()
        if(lastTransaction.studentId === this.state.scannedStudentId) {
          studentElig = true;
        } else {
          studentElig = false;
          Alert.alert("The book was not issued to this student")
          this.setState({
            scannedStudentId: "",
            scannedBookId: ""
          })
        }
      })
      return studentElig
    }

    handleTransaction = async() => {
      var transactionType = await this.bookEligiblity();
      console.log(transactionType)
      if(!transactionType) {
        Alert.alert("The book dosen't exist in the library database")
          this.setState({
            scannedBookId: "",
            scannedStudentId: ""
          })
      } 
      else if(transactionType === "issue") {
        var studentElig = await this.studentEligiblityIssue();
        if(studentElig) {
          this.intiateBookIssue();
          Alert.alert("The book has been issued to the student")
        }
      } else if(transactionType === "return") {
        var studentElig = await this.studentEligiblityReturn();
        if(studentElig) {
          this.intiateBookReturn();
          Alert.alert("The book has been returned to the library")
        } 
      }
    }
    
    intiateBookIssue = async()=> {
      db.collection("Transactions").add({
        studentId: this.state.scannedStudentId,
        bookId: this.state.scannedBookId,
        date: firebase.firestore.Timestamp.now().toDate(),
        transactionType: "issued"
      })
      db.collection("Books").doc(this.state.scannedBookId).update({
        bookAvailabilty: 'false',
      })
      db.collection("Students").doc(this.state.scannedStudentId).update({
        booksIssued: firebase.firestore.FieldValue.increment(1)
      })
      this.setState({
        scannedBookId: '',
        scannedStudentId: ''
      })
    }

    intiateBookReturn = async() => {
      db.collection("Transactions").add({
        studentId: this.state.scannedStudentId,
        bookId: this.state.scannedBookId,
        date: firebase.firestore.Timestamp.now().toDate(),
        transactionType: "returned"
      })
      db.collection("Books").doc(this.state.scannedBookId).update({
        bookAvailabilty: 'true',
      })
      db.collection("Students").doc(this.state.scannedStudentId).update({
        booksIssued: firebase.firestore.FieldValue.increment(-1)
      })
      this.setState({
        scannedBookId: '',
        scannedStudentId: ''
      })
    }

    render() {
      const hasCameraPermissions = this.state.hasCameraPermissions;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if(buttonState !== 'normal' && hasCameraPermissions){
        return(
          <BarCodeScanner
          onBarCodeScanned = {scanned? undefined: this.handleBarCodeScanned}
          style = {StyleSheet.absoluteFillObject}
          />
        )
      }else if(buttonState === 'normal'){
      return (
        <KeyboardAvoidingView style={styles.container}>
          <View>
            <Image source={require('../assets/booklogo.jpg')}
            style = {{width:200,height:200}}/>
            <Text style={{textAlign:'center',fontSize:30, color:'#30440d'}}>Wily</Text>
          </View>
          <View style = {styles.inputView}>
            <TextInput 
            style = {styles.inputBox}
            placeholder='Book Id'
            value={this.state.scannedBookId}
            onChangeText={text=>this.setState({
              scannedBookId: text
            })}/>
            <TouchableOpacity style={styles.scanButton}
            onPress={()=>{
              this.getCameraPermissions('BookId')
            }}>
              <Text style = {styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <View style = {styles.inputView}>
          <TextInput 
            style = {styles.inputBox}
            placeholder='Student Id'
            value={this.state.scannedStudentId}
            onChangeText={text=>this.setState({
              scannedStudentId: text
            })}/>
            <TouchableOpacity style={styles.scanButton}
            onPress={()=>{
              this.getCameraPermissions('StudentId')
            }}>
              <Text style = {styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={async()=>{var transactionMessage = this.handleTransaction()}} style={{backgroundColor: "green", width: 70, height: 22, textAlign: 'center'}}>
              <Text>Submit</Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
      );
      }
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    displayText:{
      fontSize: 15,
      textDecorationLine: 'underline'
    },
    scanButton:{
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10
    },
    buttonText:{
      fontSize: 20,
    },
    inputBox:{
      width:200,
      height:20,
      borderWidth:1.5,
      fontSize:15,
      justifyContent:'center'
    },
    inputView:{
      flexDirection:'row',
      margin:20
    }
  });