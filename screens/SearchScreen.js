import React from 'react';
import { Text, View } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import db from '../config'

export default class Searchscreen extends React.Component {
constructor() {
  super()
  this.state = {
    allTransactions: [],
    lastVisibleTransaction: null
  }
} 

componentDidMount = async() => {
  var queries = await db.collection("Transactions").limit(10).get()
  queries.docs.map((doc) => {
    this.setState({
      allTransactions: [...this.state.allTransactions, doc.data()]
    })
  })
}

fetchMoreTransactions = async() => {
  var queries = await db.collection("Transactions").startAfter(this.state.lastVisibleTransaction).limit(10).get()
  queries.docs.map((doc) => {
    this.setState({
      allTransactions: [...this.state.allTransactions, doc.data()],
      lastVisibleTransaction: doc
    })
  })
}

  render() {
      return (
        <View>
          <FlatList
          data = {this.state.allTransactions}
            renderItem = {({item}) => (
              <View style={{borderBottomWidth: 2}}>
                  <Text>{"transactionType: " + item.transactionType}</Text>
                  <Text>{"bookId: " + item.bookId}</Text>
                  <Text>{"studentId: " + item.studentId}</Text>
                  <Text>{"date: " + item.date}</Text>
                </View>
            )}
              keyExtractor = {(item, index) => index.toString()}
              onEndReached = {this.fetchMoreTransactions}
              onEndReachedThreshold = {0.7}
            />
        </View>
      );
    }
  }