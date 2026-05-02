import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, Animated, Dimensions,
  RefreshControl, Image, Modal, TextInput, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../constants/colors';
import { ordersAPI, reservationsAPI, menuAPI, paymentsAPI, cardsAPI } from '../../api';

const { width } = Dimensions.get('window');

const STATUS_COLORS = {
  Pending: COLORS.warning,
  Preparing: COLORS.primary,
  Ready: COLORS.success,
  Completed: COLORS.textLight,
  Cancelled: COLORS.danger,
};

const ORDER_TYPES = [
  { key: 'Dine-In', icon: 'restaurant-outline', label: 'Dine-In', desc: 'Eat at the cafe' },
  { key: 'Takeaway', icon: 'bag-handle-outline', label: 'Takeaway', desc: 'Pick up & go' },
  { key: 'Online Delivery', icon: 'bicycle-outline', label: 'Delivery', desc: 'Delivered to you' },
];

const PAYMENT_OPTIONS = {
  'Dine-In': [{ key: 'Cash', label: 'Cash', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
  'Takeaway': [{ key: 'Cash', label: 'Cash', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
  'Online Delivery': [{ key: 'Cash', label: 'Cash on Delivery', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
};

const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM'
];

const StatCard = ({ icon, label, value, color, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 7, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { transform: [{ scale: anim }], opacity: anim }]}>
      <View style={[styles.statIconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

const QuickAction = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.qaBtn} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.qaIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { cart, addToCart, removeFromCart, removeItem, cartCount, cartTotal } = useCart();
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState('All');
  const [showCheckout, setShowCheckout] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderType, setOrderType] = useState('Dine-In');
  const [tableNumber, setTableNumber] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [reservationTime, setReservationTime] = useState('12:00 PM');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingCards, setLoadingCards] = useState(false);
  const { clearCart } = useCart();

  const headerAnim = useRef(new Animated.Value(-60)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchData();
    Animated.parallel([
      Animated.spring(headerAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(contentAnim, { toValue: 0, friction: 8, delay: 200, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const opts = PAYMENT_OPTIONS[orderType];
    setPaymentMethod(opts[0].key);
    if (orderType !== 'Dine-In') setTableNumber(null);
  }, [orderType]);

  useEffect(() => {
    if (showCheckout && orderType === 'Dine-In') {
      fetchAvailability();
    }
    if (showCheckout && paymentMethod === 'Card') {
      fetchSavedCards();
    }
  }, [showCheckout, orderType, paymentMethod]);

  const fetchSavedCards = async () => {
    setLoadingCards(true);
    try {
      const res = await cardsAPI.getAll();
      const cards = res.data.data || [];
      setSavedCards(cards);
      const def = cards.find(c => c.isDefault) || cards[0];
      if (def && !selectedCard) setSelectedCard(def);
    } catch (e) { console.log(e?.message); }
    finally { setLoadingCards(false); }
  };

  const fetchAvailability = async () => {
    try {
      const res = await reservationsAPI.getAvailability();
      setBookedSlots(res.data.data || []);
    } catch (e) { console.log(e?.message); }
  };

  const handlePlaceOrder = async () => {
    if (orderType === 'Dine-In' && !tableNumber) {
      Alert.alert('Table Required', 'Please select a table for Dine-In orders.');
      return;
    }
    if (orderType === 'Online Delivery' && !deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter a delivery address.');
      return;
    }

    setPlacing(true);
    try {
      if (orderType === 'Dine-In') {
        try {
          await reservationsAPI.createReservation({
            tableNumber,
            guests: 1,
            date: new Date().toISOString().split('T')[0],
            time: reservationTime,
            specialRequests: 'Auto-reserved via Order Checkout'
          });
        } catch (e) { console.log('Reservation auto-create error', e.message); }
      }

      const orderItems = Object.entries(cart).map(([id, qty]) => ({
        product: id,
        quantity: qty.quantity
      }));

      const res = await ordersAPI.createOrder({
        items: orderItems,
        orderType,
        tableNumber,
        deliveryAddress,
        paymentMethod
      });

      const order = res.data.data;

      if (paymentMethod === 'Card') {
        if (!selectedCard) {
          Alert.alert('No Card Selected', 'Please select a saved card or add a new one from your Profile.');
          setPlacing(false);
          return;
        }
        await paymentsAPI.createPayment({
          order: order._id,
          amount: cartTotal,
          paymentMethod: 'Card',
          cardId: selectedCard._id,
          transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        });
      }

      setLastOrder({
        _id: order._id,
        orderType,
        tableNumber,
        reservationTime,
        paymentMethod,
        total: cartTotal
      });
      setOrderSuccess(true);
      clearCart();
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const fetchData = async () => {
    try {
      const [ordRes, resRes, menuRes] = await Promise.all([
        ordersAPI.getMyOrders(),
        reservationsAPI.getMyReservations(),
        menuAPI.getAll(),
      ]);
      setOrders(ordRes.data.data || []);
      setReservations(resRes.data.data || []);
      setMenu(menuRes.data.data || []);
    } catch (e) {
      console.log('Home fetch error', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', icon: 'sunny-outline' };
    if (h < 17) return { text: 'Good Afternoon', icon: 'partly-sunny-outline' };
    return { text: 'Good Evening', icon: 'moon-outline' };
  };

  const activeOrders = orders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
  const pendingRes = reservations.filter(r => ['Pending', 'Confirmed'].includes(r.status));
  const recentOrders = orders.slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }], opacity: headerOpacity }]}>
        <View style={styles.headerCircle} />
        <View style={styles.headerCircle2} />
        <View style={styles.headerContent}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={getGreeting().icon} size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.greeting}>{getGreeting().text}</Text>
            </View>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Friend'}</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentAnim }] }}>

          {/* Promotional Banner */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.bannerScroll}
          >
            {[
              { id: 1, title: 'Summer Special', subtitle: '30% OFF on all Iced Teas', color: '#FF6B35', icon: 'leaf' },
              { id: 2, title: 'Morning Kick', subtitle: 'Buy 1 Get 1 on Espresso', color: '#1E2A3A', icon: 'cafe' },
              { id: 3, title: 'Sweet Treat', subtitle: 'Free donut with any Coffee', color: '#FF9F1C', icon: 'ice-cream' }
            ].map(banner => (
              <View key={banner.id} style={[styles.banner, { backgroundColor: banner.color }]}>
                <View style={styles.bannerInfo}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerSub}>{banner.subtitle}</Text>
                  <TouchableOpacity style={styles.bannerBtn}>
                    <Text style={styles.bannerBtnText}>Claim Now</Text>
                  </TouchableOpacity>
                </View>
                <Ionicons name={banner.icon} size={80} color="rgba(255,255,255,0.2)" style={styles.bannerIcon} />
              </View>
            ))}
          </ScrollView>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {['All', 'Coffee', 'Tea', 'Snacks', 'Desserts', 'Beverages'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, activeCat === cat && styles.catChipActive]}
                onPress={() => setActiveCat(cat)}
              >
                <Text style={[styles.catText, activeCat === cat && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Trending Items */}
          <Text style={styles.sectionTitle}>Trending Now 🔥</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.trendingScroll}
            contentContainerStyle={styles.trendingContent}
          >
            {menu.filter(i => i.stock > 0).slice(0, 5).map(item => (
              <TouchableOpacity key={item._id} style={styles.trendingCard} activeOpacity={0.8}>
                <View style={styles.trendingIconBg}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.trendingImg} />
                  ) : (
                    <Ionicons name="restaurant" size={30} color={COLORS.primary} />
                  )}
                </View>
                <Text style={styles.trendingName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.trendingPrice}>Rs. {item.price}</Text>
                <TouchableOpacity style={styles.addSmall} onPress={() => addToCart(item)}>
                  <Ionicons name="add" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* All Items Grid */}
          <Text style={styles.sectionTitle}>Explore Menu</Text>
          <View style={styles.menuGrid}>
            {menu
              .filter(i => activeCat === 'All' || i.category === activeCat)
              .map(item => (
                <TouchableOpacity key={item._id} style={styles.gridCard} activeOpacity={0.8}>
                  <View style={styles.gridImgWrap}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.gridImg} />
                    ) : (
                      <Ionicons name="cafe-outline" size={32} color={COLORS.divider} />
                    )}
                    <TouchableOpacity style={styles.gridAdd} onPress={() => addToCart(item)}>
                      <Ionicons name="add" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.gridPrice}>Rs. {item.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>

          {/* Stats Summary */}
          <Text style={styles.sectionTitle}>My Activity</Text>
          <View style={styles.statsRow}>
            <StatCard icon="cart" label="Active Orders" value={activeOrders.length} color={COLORS.primary} delay={0} />
            <StatCard icon="calendar" label="Reservations" value={pendingRes.length} color={COLORS.accent} delay={100} />
          </View>

          {/* Recent Orders section removed to move to Orders screen */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => { setOrderSuccess(false); setShowCheckout(true); }}
          activeOpacity={0.9}
        >
          <View style={styles.cartInfo}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
            <View>
              <Text style={styles.cartLabel}>Checkout</Text>
              <Text style={styles.cartTotal}>Rs. {cartTotal.toFixed(2)}</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Checkout Modal */}
      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {orderSuccess ? (
              <View style={styles.successWrap}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.success} style={{ marginBottom: 10 }} />
                <Text style={styles.successTitle}>Order Placed!</Text>
                <Text style={styles.successSub}>Your order is being prepared</Text>
                {lastOrder && (
                  <View style={styles.successDetails}>
                    <View style={styles.successRow}>
                      <Text style={styles.successDetailLabel}>Order Type</Text>
                      <Text style={styles.successDetailValue}>{lastOrder.orderType}</Text>
                    </View>
                    {lastOrder.tableNumber && (
                      <View style={styles.successRow}>
                        <Text style={styles.successDetailLabel}>Table</Text>
                        <Text style={styles.successDetailValue}>#{lastOrder.tableNumber} at {lastOrder.reservationTime}</Text>
                      </View>
                    )}
                    <View style={styles.successRow}>
                      <Text style={styles.successDetailLabel}>Payment</Text>
                      <Text style={styles.successDetailValue}>{lastOrder.paymentMethod}</Text>
                    </View>
                    <View style={[styles.successRow, styles.successTotalRow]}>
                      <Text style={styles.successTotalLabel}>Total</Text>
                      <Text style={styles.successTotalValue}>Rs. {lastOrder.total.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity style={styles.successBtn} onPress={() => { setShowCheckout(false); navigation.navigate('Orders'); }}>
                  <Text style={styles.successBtnText}>Track Order</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Checkout</Text>
                  <TouchableOpacity onPress={() => setShowCheckout(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>

                {/* Cart summary */}
                <View style={styles.cartItems}>
                  {Object.entries(cart).length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Ionicons name="cart-outline" size={40} color={COLORS.textLight} />
                      <Text style={{ color: COLORS.textLight, marginTop: 10, fontWeight: '600' }}>Your cart is empty</Text>
                      <TouchableOpacity
                        style={[styles.successBtn, { marginTop: 15, paddingVertical: 10 }]}
                        onPress={() => setShowCheckout(false)}
                      >
                        <Text style={styles.successBtnText}>Back to Menu</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {Object.entries(cart).map(([id, { item, quantity }]) => (
                        <View key={id} style={styles.cartRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.cartItemPrice}>Rs. {item.price.toFixed(2)}</Text>
                          </View>
                          <View style={styles.modalQtyRow}>
                            <TouchableOpacity
                              style={styles.modalQtyBtn}
                              onPress={() => removeFromCart(id)}
                            >
                              <Ionicons name="remove" size={12} color={COLORS.textMid} />
                            </TouchableOpacity>
                            <Text style={styles.modalQtyText}>{quantity}</Text>
                            <TouchableOpacity
                              style={[styles.modalQtyBtn, { backgroundColor: COLORS.primary }]}
                              onPress={() => addToCart(item)}
                            >
                              <Ionicons name="add" size={12} color={COLORS.white} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => removeItem(id)}
                          >
                            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                          </TouchableOpacity>
                          <Text style={styles.cartItemTotal}>Rs. {(item.price * quantity).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={styles.cartTotal}>
                        <Text style={styles.cartTotalLabel}>Total</Text>
                        <Text style={styles.cartTotalAmt}>Rs. {cartTotal.toFixed(2)}</Text>
                      </View>
                    </>
                  )}
                </View>

                {Object.entries(cart).length > 0 && (
                  <>
                    <Text style={styles.stepLabel}>1. Order Type</Text>
                    <View style={styles.orderTypeRow}>
                      {ORDER_TYPES.map(t => (
                        <TouchableOpacity
                          key={t.key}
                          style={[styles.orderTypeBtn, orderType === t.key && styles.orderTypeBtnActive]}
                          onPress={() => setOrderType(t.key)}
                        >
                          <Ionicons name={t.icon} size={24} color={orderType === t.key ? COLORS.primary : COLORS.textLight} />
                          <Text style={[styles.orderTypeLabel, orderType === t.key && { color: COLORS.primary }]}>{t.label}</Text>
                          <Text style={styles.orderTypeDesc}>{t.desc}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {orderType === 'Dine-In' && (
                      <>
                        <Text style={styles.stepLabel}>2. Select Table & Time</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                          <View style={styles.tableGrid}>
                            {TABLES.map(n => (
                              <TouchableOpacity
                                key={n}
                                style={[styles.tableBtn, tableNumber === n && styles.tableBtnActive]}
                                onPress={() => setTableNumber(n)}
                              >
                                <Text style={[styles.tableBtnText, tableNumber === n && { color: COLORS.white }]}>{n}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4, marginTop: 6 }}>
                          <View style={styles.tableGrid}>
                            {TIME_SLOTS.map(t => {
                              const isBooked = tableNumber && bookedSlots.some(b => b.tableNumber === tableNumber && b.time === t);
                              return (
                                <TouchableOpacity
                                  key={t}
                                  style={[
                                    styles.timeBtn,
                                    reservationTime === t && styles.tableBtnActive,
                                    isBooked && styles.timeBtnBooked
                                  ]}
                                  onPress={() => !isBooked && setReservationTime(t)}
                                  activeOpacity={isBooked ? 1 : 0.7}
                                >
                                  <Text style={[
                                    styles.timeBtnText,
                                    reservationTime === t && { color: COLORS.white },
                                    isBooked && styles.timeBtnTextBooked
                                  ]}>{t}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </>
                    )}

                    {orderType === 'Online Delivery' && (
                      <>
                        <Text style={styles.stepLabel}>2. Delivery Address</Text>
                        <TextInput
                          style={styles.addressInput}
                          placeholder="Enter your full delivery address..."
                          placeholderTextColor={COLORS.textLight}
                          value={deliveryAddress}
                          onChangeText={setDeliveryAddress}
                          multiline
                        />
                      </>
                    )}

                    <Text style={styles.stepLabel}>Payment Method</Text>
                    <View style={styles.paymentOpts}>
                      {PAYMENT_OPTIONS[orderType].map(opt => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.payOpt, paymentMethod === opt.key && styles.payOptActive]}
                          onPress={() => setPaymentMethod(opt.key)}
                        >
                          <Ionicons name={opt.icon} size={20} color={paymentMethod === opt.key ? COLORS.primary : COLORS.textLight} />
                          <Text style={[styles.payOptLabel, paymentMethod === opt.key && { color: COLORS.primary }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Saved Card Selector — shown when Card is chosen */}
                    {paymentMethod === 'Card' && (
                      <View style={styles.cardPickerSection}>
                        <Text style={styles.cardPickerLabel}>Select Card</Text>
                        {loadingCards ? (
                          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
                        ) : savedCards.length === 0 ? (
                          <TouchableOpacity style={styles.noCardBox} onPress={() => { setShowCheckout(false); navigation.navigate('SavedCards'); }}>
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.noCardTitle}>No saved cards</Text>
                              <Text style={styles.noCardSub}>Tap to add a card in your Profile</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                          </TouchableOpacity>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                            {savedCards.map(card => {
                              const isSelected = selectedCard?._id === card._id;
                              const expiry = `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`;
                              return (
                                <TouchableOpacity
                                  key={card._id}
                                  style={[styles.miniCard, isSelected && styles.miniCardActive]}
                                  onPress={() => setSelectedCard(card)}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.miniCardTop}>
                                    <Ionicons name="card" size={18} color={isSelected ? COLORS.white : COLORS.textMid} />
                                    {card.isDefault && <View style={styles.miniDefaultDot} />}
                                  </View>
                                  <Text style={[styles.miniCardNum, isSelected && { color: '#fff' }]}>
                                    •••• {card.last4}
                                  </Text>
                                  <Text style={[styles.miniCardBrand, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                                    {card.brand} · {expiry}
                                  </Text>
                                  {isSelected && (
                                    <View style={styles.miniSelected}>
                                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.placeBtn, placing && { opacity: 0.7 }]}
                      onPress={() => handlePlaceOrder()}
                      disabled={placing}
                    >
                      {placing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.placeBtnText}>Confirm Order</Text>}
                    </TouchableOpacity>
                  </>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
      web: { boxShadow: '0 8px 14px rgba(255,107,53,0.3)' },
    }),
  },
  headerCircle: {
    position: 'absolute', top: -50, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCircle2: {
    position: 'absolute', bottom: -70, left: -30,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  userName: { fontSize: 24, fontWeight: '900', color: COLORS.white, marginTop: 4 },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },
  scroll: { padding: 20, paddingBottom: 40, paddingTop: 24 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24, paddingHorizontal: 4 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 18,
    padding: 14, alignItems: 'center', gap: 6,
    marginVertical: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.06)' },
    }),
  },
  statIconBg: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, color: COLORS.textLight, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  qaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  qaBtn: { alignItems: 'center', gap: 6, flex: 1 },
  qaIcon: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  qaEmoji: { fontSize: 24 },
  qaLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMid },

  // Checkout Styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '92%', padding: 20, paddingTop: 10
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: COLORS.divider,
    borderRadius: 2, alignSelf: 'center', marginBottom: 15
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },

  cartItems: { backgroundColor: COLORS.background, borderRadius: 20, padding: 16, marginBottom: 20 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cartItemName: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  cartItemPrice: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  modalQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8 },
  modalQtyBtn: { width: 20, height: 20, borderRadius: 5, backgroundColor: COLORS.divider, justifyContent: 'center', alignItems: 'center' },
  modalQtyText: { fontSize: 13, fontWeight: '800', color: COLORS.text, width: 16, textAlign: 'center' },
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  cartItemTotal: { fontSize: 14, color: COLORS.primary, fontWeight: '800', width: 80, textAlign: 'right' },
  cartTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginTop: 5 },
  cartTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cartTotalAmt: { fontSize: 18, fontWeight: '900', color: COLORS.primary },

  stepLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12, marginTop: 10 },
  orderTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  orderTypeBtn: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 18,
    padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent'
  },
  orderTypeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  orderTypeLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  orderTypeDesc: { fontSize: 10, color: COLORS.textLight, textAlign: 'center', marginTop: 2 },

  tableGrid: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  tableBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.divider
  },
  tableBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tableBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.text },

  timeBtn: {
    paddingHorizontal: 16, height: 40, borderRadius: 12, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.divider
  },
  timeBtnBooked: { backgroundColor: COLORS.divider, opacity: 0.5 },
  timeBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  timeBtnTextBooked: { color: COLORS.textLight },

  addressInput: {
    backgroundColor: COLORS.background, borderRadius: 18, padding: 15,
    height: 80, textAlignVertical: 'top', fontSize: 14, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.divider, marginBottom: 20
  },

  paymentOpts: { gap: 10, marginBottom: 25 },
  payOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.background, padding: 16, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.divider
  },
  payOptActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  payOptLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textMid },

  placeBtn: {
    backgroundColor: COLORS.primary, height: 60, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6
  },
  placeBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '900' },

  successWrap: { padding: 20, alignItems: 'center' },
  successTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginTop: 10 },
  successSub: { fontSize: 15, color: COLORS.textLight, marginTop: 4, marginBottom: 25 },
  successDetails: { width: '100%', backgroundColor: COLORS.background, borderRadius: 24, padding: 20, marginBottom: 30 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  successDetailLabel: { fontSize: 13, color: COLORS.textLight },
  successDetailValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  successTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginTop: 5 },
  successTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  successTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  successBtn: {
    backgroundColor: COLORS.primary, width: '100%', height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center'
  },
  successBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 30, alignItems: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 12, marginTop: 6,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  orderCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
    }),
  },
  orderIconBg: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  orderIcon: { fontSize: 22 },
  orderInfo: { flex: 1 },
  orderNum: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  orderMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  orderSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  resCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
    }),
  },
  resEmoji: { fontSize: 26 },
  resInfo: { flex: 1 },
  resTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  resMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  // New Styles
  bannerScroll: { marginBottom: 24, marginHorizontal: -20 },
  banner: {
    width: width - 40, height: 160, borderRadius: 24, marginHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', padding: 24, overflow: 'hidden'
  },
  bannerInfo: { flex: 1, zIndex: 1 },
  bannerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4, marginBottom: 16 },
  bannerBtn: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  bannerBtnText: { color: COLORS.text, fontWeight: '800', fontSize: 12 },
  bannerIcon: { position: 'absolute', right: -10, bottom: -10 },

  catScroll: { marginBottom: 24, marginHorizontal: -20, paddingHorizontal: 20 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: COLORS.surface, marginRight: 10, borderWidth: 1.5, borderColor: COLORS.divider },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, fontWeight: '700', color: COLORS.textLight },
  catTextActive: { color: COLORS.white },

  trendingScroll: { marginBottom: 12, marginHorizontal: -20 },
  trendingContent: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  trendingCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 12,
    marginRight: 16,
    marginVertical: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 }
    })
  },
  trendingIconBg: { width: '100%', height: 100, borderRadius: 16, backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  trendingImg: { width: '100%', height: '100%' },
  trendingName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  trendingPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '800', marginTop: 2 },
  addSmall: { position: 'absolute', right: 10, bottom: 10, width: 24, height: 24, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  gridCard: { width: (width - 54) / 2, backgroundColor: COLORS.surface, borderRadius: 20, padding: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 }, android: { elevation: 3 } }) },
  gridImgWrap: { width: '100%', height: 110, borderRadius: 16, backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  gridImg: { width: '100%', height: '100%' },
  gridAdd: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },
  gridInfo: { paddingHorizontal: 4 },
  gridName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  gridPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '800', marginTop: 2 },

  floatingCart: {
    position: 'absolute', bottom: 30, left: 20, right: 20,
    height: 64, backgroundColor: COLORS.secondary, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    ...Platform.select({ ios: { shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 }, android: { elevation: 10 } })
  },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBadge: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  cartLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  cartTotal: { fontSize: 16, color: COLORS.white, fontWeight: '800' },

  // Saved Card Picker (Checkout)
  cardPickerSection: { marginBottom: 16 },
  cardPickerLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textLight, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  noCardBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.divider,
  },
  noCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  noCardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  miniCard: {
    width: 130, borderRadius: 16, padding: 14, marginRight: 12,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.divider,
  },
  miniCardActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  miniCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  miniDefaultDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  miniCardNum: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  miniCardBrand: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  miniSelected: { position: 'absolute', top: 10, right: 10 },
});

export default HomeScreen;
