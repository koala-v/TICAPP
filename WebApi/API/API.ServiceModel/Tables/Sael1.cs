using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace WebApi.ServiceModel.Tables
{
    public class Sael1
    {
       
        public int LineItemNo { get; set; }
        public string TableName { get; set; }
        public string PrimaryKeyName { get; set; }
        public string PrimaryKeyValue { get; set; }
        public string Description { get; set; }
        public string  UpdateBy { get; set; }
        public Nullable<System.DateTime> DateTime { get; set; }
        public Nullable<System.DateTime> UpdateDatetime { get; set; }
   
    }
}
