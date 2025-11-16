-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: jail_visitation
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `denied_visitors`
--

DROP TABLE IF EXISTS `denied_visitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `denied_visitors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `visitor_name` varchar(255) NOT NULL,
  `pdl_name` varchar(255) NOT NULL,
  `dorm` varchar(50) NOT NULL,
  `time_in` datetime NOT NULL,
  `reason` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `denied_visitors`
--

LOCK TABLES `denied_visitors` WRITE;
/*!40000 ALTER TABLE `denied_visitors` DISABLE KEYS */;
INSERT INTO `denied_visitors` VALUES (1,'Denver Macaraig','NOne','sssss','2025-05-12 16:17:00','none','2025-05-12 08:19:07','2025-05-12 08:19:07');
/*!40000 ALTER TABLE `denied_visitors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pdls`
--

DROP TABLE IF EXISTS `pdls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pdls` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `last_name` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `dorm_number` varchar(50) NOT NULL,
  `criminal_case_no` varchar(100) DEFAULT NULL,
  `offense_charge` varchar(255) DEFAULT NULL,
  `court_branch` varchar(255) DEFAULT NULL,
  `arrest_date` date DEFAULT NULL,
  `commitment_date` date DEFAULT NULL,
  `first_time_offender` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pdls`
--

LOCK TABLES `pdls` WRITE;
/*!40000 ALTER TABLE `pdls` DISABLE KEYS */;
INSERT INTO `pdls` VALUES (1,'Doe','John','A','D1','CC123','Theft','Branch 1','2025-01-01','2025-01-15',1,'2025-05-11 08:11:22','2025-05-11 08:11:22'),(3,'manalang','dien','diezza','2','TG-15-1654 (AS)/TG-17-596(AS)','Viol of RA 10591/robbery with Homicide','3','2025-05-07','2025-05-01',1,'2025-05-12 08:42:19','2025-05-12 08:42:19');
/*!40000 ALTER TABLE `pdls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scanned_visitors`
--

DROP TABLE IF EXISTS `scanned_visitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `scanned_visitors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `visitor_name` varchar(255) NOT NULL,
  `pdl_name` varchar(255) NOT NULL,
  `dorm` varchar(50) NOT NULL,
  `time_in` datetime NOT NULL,
  `time_out` datetime DEFAULT NULL,
  `scan_date` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scanned_visitors`
--

LOCK TABLES `scanned_visitors` WRITE;
/*!40000 ALTER TABLE `scanned_visitors` DISABLE KEYS */;
INSERT INTO `scanned_visitors` VALUES (15,'dien diezza manalang','John Doe','D1','2025-05-12 07:14:53','2025-05-12 07:14:53','2025-05-12 07:14:53','2025-05-12 07:14:53','2025-05-12 07:14:53'),(20,'dien diezza manalang','dien manalang','2','2025-05-12 08:51:01',NULL,'2025-05-12 08:51:01','2025-05-12 08:51:01','2025-05-12 08:51:01');
/*!40000 ALTER TABLE `scanned_visitors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visitors`
--

DROP TABLE IF EXISTS `visitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `visitors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pdl_id` int(11) NOT NULL,
  `visitor_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `relationship` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `valid_id` varchar(255) NOT NULL,
  `date_of_application` date NOT NULL,
  `contact_number` varchar(50) NOT NULL,
  `time_in` datetime DEFAULT NULL,
  `time_out` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `visitor_id` (`visitor_id`),
  KEY `pdl_id` (`pdl_id`),
  CONSTRAINT `visitors_ibfk_1` FOREIGN KEY (`pdl_id`) REFERENCES `pdls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visitors`
--

LOCK TABLES `visitors` WRITE;
/*!40000 ALTER TABLE `visitors` DISABLE KEYS */;
INSERT INTO `visitors` VALUES (1,1,'VIS-1001','Alice Johnson','Friend','123 Main St','ID12345','2025-05-01','555-1234',NULL,NULL,'2025-05-11 08:11:22','2025-05-11 08:11:22'),(2,1,'VIS-1002','Bob Williams','Brother','456 Oak Ave','ID67890','2025-05-02','555-5678',NULL,NULL,'2025-05-11 08:11:22','2025-05-11 08:11:22'),(3,1,'VIS-1746952352970','swsw','wsws','sws','wswsw','2025-05-11','swswsws',NULL,NULL,'2025-05-11 08:32:32','2025-05-11 08:32:32'),(4,1,'VIS-1747032233188','dedc','dcdcdc','dcdcd','cdcdcdc','2025-05-08','cddcdc',NULL,NULL,'2025-05-12 06:43:53','2025-05-12 06:43:53'),(5,3,'VIS-1747039375600','dien diezza manalang','sister','Talon uno robinson place las pinas  2nd level Chaboba store','sss id','2025-05-07','09542416532',NULL,NULL,'2025-05-12 08:42:55','2025-05-12 08:42:55');
/*!40000 ALTER TABLE `visitors` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-13  8:14:02
